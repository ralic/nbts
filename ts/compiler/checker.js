// This file has been modified from the original for netbeanstypescript.
// Portions Copyrighted 2015 Everlaw
/// <reference path="binder.ts"/>
/* @internal */
var ts;
(function (ts) {
    var nextSymbolId = 1;
    var nextNodeId = 1;
    var nextMergeId = 1;
    function getNodeId(node) {
        if (!node.id) {
            node.id = nextNodeId;
            nextNodeId++;
        }
        return node.id;
    }
    ts.getNodeId = getNodeId;
    ts.checkTime = 0;
    function getSymbolId(symbol) {
        if (!symbol.id) {
            symbol.id = nextSymbolId;
            nextSymbolId++;
        }
        return symbol.id;
    }
    ts.getSymbolId = getSymbolId;
    function createTypeChecker(host, produceDiagnostics) {
        // Cancellation that controls whether or not we can cancel in the middle of type checking.
        // In general cancelling is *not* safe for the type checker.  We might be in the middle of
        // computing something, and we will leave our internals in an inconsistent state.  Callers
        // who set the cancellation token should catch if a cancellation exception occurs, and
        // should throw away and create a new TypeChecker.
        //
        // Currently we only support setting the cancellation token when getting diagnostics.  This
        // is because diagnostics can be quite expensive, and we want to allow hosts to bail out if
        // they no longer need the information (for example, if the user started editing again).
        var cancellationToken;
        var Symbol = ts.objectAllocator.getSymbolConstructor();
        var Type = ts.objectAllocator.getTypeConstructor();
        var Signature = ts.objectAllocator.getSignatureConstructor();
        var typeCount = 0;
        var symbolCount = 0;
        var emptyArray = [];
        var emptySymbols = {};
        var compilerOptions = host.getCompilerOptions();
        var languageVersion = compilerOptions.target || 0 /* ES3 */;
        var modulekind = ts.getEmitModuleKind(compilerOptions);
        var allowSyntheticDefaultImports = typeof compilerOptions.allowSyntheticDefaultImports !== "undefined" ? compilerOptions.allowSyntheticDefaultImports : modulekind === 4 /* System */;
        var emitResolver = createResolver();
        var undefinedSymbol = createSymbol(4 /* Property */ | 67108864 /* Transient */, "undefined");
        undefinedSymbol.declarations = [];
        var argumentsSymbol = createSymbol(4 /* Property */ | 67108864 /* Transient */, "arguments");
        var checker = {
            getNodeCount: function () { return ts.sum(host.getSourceFiles(), "nodeCount"); },
            getIdentifierCount: function () { return ts.sum(host.getSourceFiles(), "identifierCount"); },
            getSymbolCount: function () { return ts.sum(host.getSourceFiles(), "symbolCount") + symbolCount; },
            getTypeCount: function () { return typeCount; },
            isUndefinedSymbol: function (symbol) { return symbol === undefinedSymbol; },
            isArgumentsSymbol: function (symbol) { return symbol === argumentsSymbol; },
            isUnknownSymbol: function (symbol) { return symbol === unknownSymbol; },
            getDiagnostics: getDiagnostics,
            getGlobalDiagnostics: getGlobalDiagnostics,
            // The language service will always care about the narrowed type of a symbol, because that is
            // the type the language says the symbol should have.
            getTypeOfSymbolAtLocation: getNarrowedTypeOfSymbol,
            getSymbolsOfParameterPropertyDeclaration: getSymbolsOfParameterPropertyDeclaration,
            getDeclaredTypeOfSymbol: getDeclaredTypeOfSymbol,
            getPropertiesOfType: getPropertiesOfType,
            getPropertyOfType: getPropertyOfType,
            getSignaturesOfType: getSignaturesOfType,
            getIndexTypeOfType: getIndexTypeOfType,
            getBaseTypes: getBaseTypes,
            getReturnTypeOfSignature: getReturnTypeOfSignature,
            getSymbolsInScope: getSymbolsInScope,
            getSymbolAtLocation: getSymbolAtLocation,
            getShorthandAssignmentValueSymbol: getShorthandAssignmentValueSymbol,
            getExportSpecifierLocalTargetSymbol: getExportSpecifierLocalTargetSymbol,
            getTypeAtLocation: getTypeOfNode,
            typeToString: typeToString,
            getSymbolDisplayBuilder: getSymbolDisplayBuilder,
            symbolToString: symbolToString,
            getAugmentedPropertiesOfType: getAugmentedPropertiesOfType,
            getRootSymbols: getRootSymbols,
            getContextualType: getContextualType,
            getFullyQualifiedName: getFullyQualifiedName,
            getResolvedSignature: getResolvedSignature,
            getConstantValue: getConstantValue,
            isValidPropertyAccess: isValidPropertyAccess,
            getSignatureFromDeclaration: getSignatureFromDeclaration,
            isImplementationOfOverload: isImplementationOfOverload,
            getAliasedSymbol: resolveAlias,
            getEmitResolver: getEmitResolver,
            getExportsOfModule: getExportsOfModuleAsArray,
            getJsxElementAttributesType: getJsxElementAttributesType,
            getJsxIntrinsicTagNames: getJsxIntrinsicTagNames,
            isOptionalParameter: isOptionalParameter
        };
        var unknownSymbol = createSymbol(4 /* Property */ | 67108864 /* Transient */, "unknown");
        var resolvingSymbol = createSymbol(67108864 /* Transient */, "__resolving__");
        var anyType = createIntrinsicType(1 /* Any */, "any");
        var stringType = createIntrinsicType(2 /* String */, "string");
        var numberType = createIntrinsicType(4 /* Number */, "number");
        var booleanType = createIntrinsicType(8 /* Boolean */, "boolean");
        var esSymbolType = createIntrinsicType(16777216 /* ESSymbol */, "symbol");
        var voidType = createIntrinsicType(16 /* Void */, "void");
        var undefinedType = createIntrinsicType(32 /* Undefined */ | 2097152 /* ContainsUndefinedOrNull */, "undefined");
        var nullType = createIntrinsicType(64 /* Null */ | 2097152 /* ContainsUndefinedOrNull */, "null");
        var unknownType = createIntrinsicType(1 /* Any */, "unknown");
        var emptyObjectType = createAnonymousType(undefined, emptySymbols, emptyArray, emptyArray, undefined, undefined);
        var emptyUnionType = emptyObjectType;
        var emptyGenericType = createAnonymousType(undefined, emptySymbols, emptyArray, emptyArray, undefined, undefined);
        emptyGenericType.instantiations = {};
        var anyFunctionType = createAnonymousType(undefined, emptySymbols, emptyArray, emptyArray, undefined, undefined);
        // The anyFunctionType contains the anyFunctionType by definition. The flag is further propagated
        // in getPropagatingFlagsOfTypes, and it is checked in inferFromTypes.
        anyFunctionType.flags |= 8388608 /* ContainsAnyFunctionType */;
        var noConstraintType = createAnonymousType(undefined, emptySymbols, emptyArray, emptyArray, undefined, undefined);
        var anySignature = createSignature(undefined, undefined, emptyArray, anyType, /*typePredicate*/ undefined, 0, /*hasRestParameter*/ false, /*hasStringLiterals*/ false);
        var unknownSignature = createSignature(undefined, undefined, emptyArray, unknownType, /*typePredicate*/ undefined, 0, /*hasRestParameter*/ false, /*hasStringLiterals*/ false);
        var globals = {};
        var globalESSymbolConstructorSymbol;
        var getGlobalPromiseConstructorSymbol;
        var globalObjectType;
        var globalFunctionType;
        var globalArrayType;
        var globalStringType;
        var globalNumberType;
        var globalBooleanType;
        var globalRegExpType;
        var globalTemplateStringsArrayType;
        var globalESSymbolType;
        var globalIterableType;
        var globalIteratorType;
        var globalIterableIteratorType;
        var anyArrayType;
        var getGlobalClassDecoratorType;
        var getGlobalParameterDecoratorType;
        var getGlobalPropertyDecoratorType;
        var getGlobalMethodDecoratorType;
        var getGlobalTypedPropertyDescriptorType;
        var getGlobalPromiseType;
        var tryGetGlobalPromiseType;
        var getGlobalPromiseLikeType;
        var getInstantiatedGlobalPromiseLikeType;
        var getGlobalPromiseConstructorLikeType;
        var getGlobalThenableType;
        var jsxElementClassType;
        var deferredNodes;
        var tupleTypes = {};
        var unionTypes = {};
        var intersectionTypes = {};
        var stringLiteralTypes = {};
        var resolutionTargets = [];
        var resolutionResults = [];
        var resolutionPropertyNames = [];
        var mergedSymbols = [];
        var symbolLinks = [];
        var nodeLinks = [];
        var potentialThisCollisions = [];
        var awaitedTypeStack = [];
        var diagnostics = ts.createDiagnosticCollection();
        var primitiveTypeInfo = {
            "string": {
                type: stringType,
                flags: 258 /* StringLike */
            },
            "number": {
                type: numberType,
                flags: 132 /* NumberLike */
            },
            "boolean": {
                type: booleanType,
                flags: 8 /* Boolean */
            },
            "symbol": {
                type: esSymbolType,
                flags: 16777216 /* ESSymbol */
            },
            "undefined": {
                type: undefinedType,
                flags: 2097152 /* ContainsUndefinedOrNull */
            }
        };
        var jsxElementType;
        /** Things we lazy load from the JSX namespace */
        var jsxTypes = {};
        var JsxNames = {
            JSX: "JSX",
            IntrinsicElements: "IntrinsicElements",
            ElementClass: "ElementClass",
            ElementAttributesPropertyNameContainer: "ElementAttributesProperty",
            Element: "Element",
            IntrinsicAttributes: "IntrinsicAttributes",
            IntrinsicClassAttributes: "IntrinsicClassAttributes"
        };
        var subtypeRelation = {};
        var assignableRelation = {};
        var identityRelation = {};
        // This is for caching the result of getSymbolDisplayBuilder. Do not access directly.
        var _displayBuilder;
        var builtinGlobals = (_a = {},
            _a[undefinedSymbol.name] = undefinedSymbol,
            _a
        );
        initializeTypeChecker();
        return checker;
        function getEmitResolver(sourceFile, cancellationToken) {
            // Ensure we have all the type information in place for this file so that all the
            // emitter questions of this resolver will return the right information.
            getDiagnostics(sourceFile, cancellationToken);
            return emitResolver;
        }
        function error(location, message, arg0, arg1, arg2) {
            var diagnostic = location
                ? ts.createDiagnosticForNode(location, message, arg0, arg1, arg2)
                : ts.createCompilerDiagnostic(message, arg0, arg1, arg2);
            diagnostics.add(diagnostic);
        }
        function createSymbol(flags, name) {
            symbolCount++;
            return new Symbol(flags, name);
        }
        function getExcludedSymbolFlags(flags) {
            var result = 0;
            if (flags & 2 /* BlockScopedVariable */)
                result |= 107455 /* BlockScopedVariableExcludes */;
            if (flags & 1 /* FunctionScopedVariable */)
                result |= 107454 /* FunctionScopedVariableExcludes */;
            if (flags & 4 /* Property */)
                result |= 107455 /* PropertyExcludes */;
            if (flags & 8 /* EnumMember */)
                result |= 107455 /* EnumMemberExcludes */;
            if (flags & 16 /* Function */)
                result |= 106927 /* FunctionExcludes */;
            if (flags & 32 /* Class */)
                result |= 899519 /* ClassExcludes */;
            if (flags & 64 /* Interface */)
                result |= 792960 /* InterfaceExcludes */;
            if (flags & 256 /* RegularEnum */)
                result |= 899327 /* RegularEnumExcludes */;
            if (flags & 128 /* ConstEnum */)
                result |= 899967 /* ConstEnumExcludes */;
            if (flags & 512 /* ValueModule */)
                result |= 106639 /* ValueModuleExcludes */;
            if (flags & 8192 /* Method */)
                result |= 99263 /* MethodExcludes */;
            if (flags & 32768 /* GetAccessor */)
                result |= 41919 /* GetAccessorExcludes */;
            if (flags & 65536 /* SetAccessor */)
                result |= 74687 /* SetAccessorExcludes */;
            if (flags & 262144 /* TypeParameter */)
                result |= 530912 /* TypeParameterExcludes */;
            if (flags & 524288 /* TypeAlias */)
                result |= 793056 /* TypeAliasExcludes */;
            if (flags & 8388608 /* Alias */)
                result |= 8388608 /* AliasExcludes */;
            return result;
        }
        function recordMergedSymbol(target, source) {
            if (!source.mergeId) {
                source.mergeId = nextMergeId;
                nextMergeId++;
            }
            mergedSymbols[source.mergeId] = target;
        }
        function cloneSymbol(symbol) {
            var result = createSymbol(symbol.flags | 33554432 /* Merged */, symbol.name);
            result.declarations = symbol.declarations.slice(0);
            result.parent = symbol.parent;
            if (symbol.valueDeclaration)
                result.valueDeclaration = symbol.valueDeclaration;
            if (symbol.constEnumOnlyModule)
                result.constEnumOnlyModule = true;
            if (symbol.members)
                result.members = cloneSymbolTable(symbol.members);
            if (symbol.exports)
                result.exports = cloneSymbolTable(symbol.exports);
            recordMergedSymbol(result, symbol);
            return result;
        }
        function mergeSymbol(target, source) {
            if (!(target.flags & getExcludedSymbolFlags(source.flags))) {
                if (source.flags & 512 /* ValueModule */ && target.flags & 512 /* ValueModule */ && target.constEnumOnlyModule && !source.constEnumOnlyModule) {
                    // reset flag when merging instantiated module into value module that has only const enums
                    target.constEnumOnlyModule = false;
                }
                target.flags |= source.flags;
                if (source.valueDeclaration &&
                    (!target.valueDeclaration ||
                        (target.valueDeclaration.kind === 221 /* ModuleDeclaration */ && source.valueDeclaration.kind !== 221 /* ModuleDeclaration */))) {
                    // other kinds of value declarations take precedence over modules
                    target.valueDeclaration = source.valueDeclaration;
                }
                ts.forEach(source.declarations, function (node) {
                    target.declarations.push(node);
                });
                if (source.members) {
                    if (!target.members)
                        target.members = {};
                    mergeSymbolTable(target.members, source.members);
                }
                if (source.exports) {
                    if (!target.exports)
                        target.exports = {};
                    mergeSymbolTable(target.exports, source.exports);
                }
                recordMergedSymbol(target, source);
            }
            else {
                var message_1 = target.flags & 2 /* BlockScopedVariable */ || source.flags & 2 /* BlockScopedVariable */
                    ? ts.Diagnostics.Cannot_redeclare_block_scoped_variable_0 : ts.Diagnostics.Duplicate_identifier_0;
                ts.forEach(source.declarations, function (node) {
                    error(node.name ? node.name : node, message_1, symbolToString(source));
                });
                ts.forEach(target.declarations, function (node) {
                    error(node.name ? node.name : node, message_1, symbolToString(source));
                });
            }
        }
        function cloneSymbolTable(symbolTable) {
            var result = {};
            for (var id in symbolTable) {
                if (ts.hasProperty(symbolTable, id)) {
                    result[id] = symbolTable[id];
                }
            }
            return result;
        }
        function mergeSymbolTable(target, source) {
            for (var id in source) {
                if (ts.hasProperty(source, id)) {
                    if (!ts.hasProperty(target, id)) {
                        target[id] = source[id];
                    }
                    else {
                        var symbol = target[id];
                        if (!(symbol.flags & 33554432 /* Merged */)) {
                            target[id] = symbol = cloneSymbol(symbol);
                        }
                        mergeSymbol(symbol, source[id]);
                    }
                }
            }
        }
        function mergeModuleAugmentation(moduleName) {
            var moduleAugmentation = moduleName.parent;
            if (moduleAugmentation.symbol.valueDeclaration !== moduleAugmentation) {
                // this is a combined symbol for multiple augmentations within the same file.
                // its symbol already has accumulated information for all declarations
                // so we need to add it just once - do the work only for first declaration
                ts.Debug.assert(moduleAugmentation.symbol.declarations.length > 1);
                return;
            }
            if (ts.isGlobalScopeAugmentation(moduleAugmentation)) {
                mergeSymbolTable(globals, moduleAugmentation.symbol.exports);
            }
            else {
                // find a module that about to be augmented
                var mainModule = resolveExternalModuleNameWorker(moduleName, moduleName, ts.Diagnostics.Invalid_module_name_in_augmentation_module_0_cannot_be_found);
                if (!mainModule) {
                    return;
                }
                // obtain item referenced by 'export='
                mainModule = resolveExternalModuleSymbol(mainModule);
                if (mainModule.flags & 1536 /* Namespace */) {
                    // if module symbol has already been merged - it is safe to use it.
                    // otherwise clone it
                    mainModule = mainModule.flags & 33554432 /* Merged */ ? mainModule : cloneSymbol(mainModule);
                    mergeSymbol(mainModule, moduleAugmentation.symbol);
                }
                else {
                    error(moduleName, ts.Diagnostics.Cannot_augment_module_0_because_it_resolves_to_a_non_module_entity, moduleName.text);
                }
            }
        }
        function addToSymbolTable(target, source, message) {
            for (var id in source) {
                if (ts.hasProperty(source, id)) {
                    if (ts.hasProperty(target, id)) {
                        // Error on redeclarations
                        ts.forEach(target[id].declarations, addDeclarationDiagnostic(id, message));
                    }
                    else {
                        target[id] = source[id];
                    }
                }
            }
            function addDeclarationDiagnostic(id, message) {
                return function (declaration) { return diagnostics.add(ts.createDiagnosticForNode(declaration, message, id)); };
            }
        }
        function getSymbolLinks(symbol) {
            if (symbol.flags & 67108864 /* Transient */)
                return symbol;
            var id = getSymbolId(symbol);
            return symbolLinks[id] || (symbolLinks[id] = {});
        }
        function getNodeLinks(node) {
            var nodeId = getNodeId(node);
            return nodeLinks[nodeId] || (nodeLinks[nodeId] = {});
        }
        function isGlobalSourceFile(node) {
            return node.kind === 251 /* SourceFile */ && !ts.isExternalOrCommonJsModule(node);
        }
        function getSymbol(symbols, name, meaning) {
            if (meaning && ts.hasProperty(symbols, name)) {
                var symbol = symbols[name];
                ts.Debug.assert((symbol.flags & 16777216 /* Instantiated */) === 0, "Should never get an instantiated symbol here.");
                if (symbol.flags & meaning) {
                    return symbol;
                }
                if (symbol.flags & 8388608 /* Alias */) {
                    var target = resolveAlias(symbol);
                    // Unknown symbol means an error occurred in alias resolution, treat it as positive answer to avoid cascading errors
                    if (target === unknownSymbol || target.flags & meaning) {
                        return symbol;
                    }
                }
            }
            // return undefined if we can't find a symbol.
        }
        /**
         * Get symbols that represent parameter-property-declaration as parameter and as property declaration
         * @param parameter a parameterDeclaration node
         * @param parameterName a name of the parameter to get the symbols for.
         * @return a tuple of two symbols
         */
        function getSymbolsOfParameterPropertyDeclaration(parameter, parameterName) {
            var constructoDeclaration = parameter.parent;
            var classDeclaration = parameter.parent.parent;
            var parameterSymbol = getSymbol(constructoDeclaration.locals, parameterName, 107455 /* Value */);
            var propertySymbol = getSymbol(classDeclaration.symbol.members, parameterName, 107455 /* Value */);
            if (parameterSymbol && propertySymbol) {
                return [parameterSymbol, propertySymbol];
            }
            ts.Debug.fail("There should exist two symbols, one as property declaration and one as parameter declaration");
        }
        function isBlockScopedNameDeclaredBeforeUse(declaration, usage) {
            var declarationFile = ts.getSourceFileOfNode(declaration);
            var useFile = ts.getSourceFileOfNode(usage);
            if (declarationFile !== useFile) {
                if (modulekind || (!compilerOptions.outFile && !compilerOptions.out)) {
                    // nodes are in different files and order cannot be determines
                    return true;
                }
                var sourceFiles = host.getSourceFiles();
                return ts.indexOf(sourceFiles, declarationFile) <= ts.indexOf(sourceFiles, useFile);
            }
            if (declaration.pos <= usage.pos) {
                // declaration is before usage
                // still might be illegal if usage is in the initializer of the variable declaration
                return declaration.kind !== 214 /* VariableDeclaration */ ||
                    !isImmediatelyUsedInInitializerOfBlockScopedVariable(declaration, usage);
            }
            // declaration is after usage
            // can be legal if usage is deferred (i.e. inside function or in initializer of instance property)
            return isUsedInFunctionOrNonStaticProperty(declaration, usage);
            function isImmediatelyUsedInInitializerOfBlockScopedVariable(declaration, usage) {
                var container = ts.getEnclosingBlockScopeContainer(declaration);
                if (declaration.parent.parent.kind === 196 /* VariableStatement */ ||
                    declaration.parent.parent.kind === 202 /* ForStatement */) {
                    // variable statement/for statement case,
                    // use site should not be inside variable declaration (initializer of declaration or binding element)
                    return isSameScopeDescendentOf(usage, declaration, container);
                }
                else if (declaration.parent.parent.kind === 204 /* ForOfStatement */ ||
                    declaration.parent.parent.kind === 203 /* ForInStatement */) {
                    // ForIn/ForOf case - use site should not be used in expression part
                    var expression = declaration.parent.parent.expression;
                    return isSameScopeDescendentOf(usage, expression, container);
                }
            }
            function isUsedInFunctionOrNonStaticProperty(declaration, usage) {
                var container = ts.getEnclosingBlockScopeContainer(declaration);
                var current = usage;
                while (current) {
                    if (current === container) {
                        return false;
                    }
                    if (ts.isFunctionLike(current)) {
                        return true;
                    }
                    var initializerOfNonStaticProperty = current.parent &&
                        current.parent.kind === 142 /* PropertyDeclaration */ &&
                        (current.parent.flags & 64 /* Static */) === 0 &&
                        current.parent.initializer === current;
                    if (initializerOfNonStaticProperty) {
                        return true;
                    }
                    current = current.parent;
                }
                return false;
            }
        }
        // Resolve a given name for a given meaning at a given location. An error is reported if the name was not found and
        // the nameNotFoundMessage argument is not undefined. Returns the resolved symbol, or undefined if no symbol with
        // the given name can be found.
        function resolveName(location, name, meaning, nameNotFoundMessage, nameArg) {
            var result;
            var lastLocation;
            var propertyWithInvalidInitializer;
            var errorLocation = location;
            var grandparent;
            loop: while (location) {
                // Locals of a source file are not in scope (because they get merged into the global symbol table)
                if (location.locals && !isGlobalSourceFile(location)) {
                    if (result = getSymbol(location.locals, name, meaning)) {
                        var useResult = true;
                        if (ts.isFunctionLike(location) && lastLocation && lastLocation !== location.body) {
                            // symbol lookup restrictions for function-like declarations
                            // - Type parameters of a function are in scope in the entire function declaration, including the parameter
                            //   list and return type. However, local types are only in scope in the function body.
                            // - parameters are only in the scope of function body
                            // This restriction does not apply to JSDoc comment types because they are parented
                            // at a higher level than type parameters would normally be
                            if (meaning & result.flags & 793056 /* Type */ && lastLocation.kind !== 268 /* JSDocComment */) {
                                useResult = result.flags & 262144 /* TypeParameter */
                                    ? lastLocation === location.type ||
                                        lastLocation.kind === 139 /* Parameter */ ||
                                        lastLocation.kind === 138 /* TypeParameter */
                                    : false;
                            }
                            if (meaning & 107455 /* Value */ && result.flags & 1 /* FunctionScopedVariable */) {
                                // parameters are visible only inside function body, parameter list and return type
                                // technically for parameter list case here we might mix parameters and variables declared in function,
                                // however it is detected separately when checking initializers of parameters
                                // to make sure that they reference no variables declared after them.
                                useResult =
                                    lastLocation.kind === 139 /* Parameter */ ||
                                        (lastLocation === location.type &&
                                            result.valueDeclaration.kind === 139 /* Parameter */);
                            }
                        }
                        if (useResult) {
                            break loop;
                        }
                        else {
                            result = undefined;
                        }
                    }
                }
                switch (location.kind) {
                    case 251 /* SourceFile */:
                        if (!ts.isExternalOrCommonJsModule(location))
                            break;
                    case 221 /* ModuleDeclaration */:
                        var moduleExports = getSymbolOfNode(location).exports;
                        if (location.kind === 251 /* SourceFile */ || ts.isAmbientModule(location)) {
                            // It's an external module. First see if the module has an export default and if the local
                            // name of that export default matches.
                            if (result = moduleExports["default"]) {
                                var localSymbol = ts.getLocalSymbolForExportDefault(result);
                                if (localSymbol && (result.flags & meaning) && localSymbol.name === name) {
                                    break loop;
                                }
                                result = undefined;
                            }
                            // Because of module/namespace merging, a module's exports are in scope,
                            // yet we never want to treat an export specifier as putting a member in scope.
                            // Therefore, if the name we find is purely an export specifier, it is not actually considered in scope.
                            // Two things to note about this:
                            //     1. We have to check this without calling getSymbol. The problem with calling getSymbol
                            //        on an export specifier is that it might find the export specifier itself, and try to
                            //        resolve it as an alias. This will cause the checker to consider the export specifier
                            //        a circular alias reference when it might not be.
                            //     2. We check === SymbolFlags.Alias in order to check that the symbol is *purely*
                            //        an alias. If we used &, we'd be throwing out symbols that have non alias aspects,
                            //        which is not the desired behavior.
                            if (ts.hasProperty(moduleExports, name) &&
                                moduleExports[name].flags === 8388608 /* Alias */ &&
                                ts.getDeclarationOfKind(moduleExports[name], 233 /* ExportSpecifier */)) {
                                break;
                            }
                        }
                        if (result = getSymbol(moduleExports, name, meaning & 8914931 /* ModuleMember */)) {
                            break loop;
                        }
                        break;
                    case 220 /* EnumDeclaration */:
                        if (result = getSymbol(getSymbolOfNode(location).exports, name, meaning & 8 /* EnumMember */)) {
                            break loop;
                        }
                        break;
                    case 142 /* PropertyDeclaration */:
                    case 141 /* PropertySignature */:
                        // TypeScript 1.0 spec (April 2014): 8.4.1
                        // Initializer expressions for instance member variables are evaluated in the scope
                        // of the class constructor body but are not permitted to reference parameters or
                        // local variables of the constructor. This effectively means that entities from outer scopes
                        // by the same name as a constructor parameter or local variable are inaccessible
                        // in initializer expressions for instance member variables.
                        if (ts.isClassLike(location.parent) && !(location.flags & 64 /* Static */)) {
                            var ctor = findConstructorDeclaration(location.parent);
                            if (ctor && ctor.locals) {
                                if (getSymbol(ctor.locals, name, meaning & 107455 /* Value */)) {
                                    // Remember the property node, it will be used later to report appropriate error
                                    propertyWithInvalidInitializer = location;
                                }
                            }
                        }
                        break;
                    case 217 /* ClassDeclaration */:
                    case 189 /* ClassExpression */:
                    case 218 /* InterfaceDeclaration */:
                        if (result = getSymbol(getSymbolOfNode(location).members, name, meaning & 793056 /* Type */)) {
                            if (lastLocation && lastLocation.flags & 64 /* Static */) {
                                // TypeScript 1.0 spec (April 2014): 3.4.1
                                // The scope of a type parameter extends over the entire declaration with which the type
                                // parameter list is associated, with the exception of static member declarations in classes.
                                error(errorLocation, ts.Diagnostics.Static_members_cannot_reference_class_type_parameters);
                                return undefined;
                            }
                            break loop;
                        }
                        if (location.kind === 189 /* ClassExpression */ && meaning & 32 /* Class */) {
                            var className = location.name;
                            if (className && name === className.text) {
                                result = location.symbol;
                                break loop;
                            }
                        }
                        break;
                    // It is not legal to reference a class's own type parameters from a computed property name that
                    // belongs to the class. For example:
                    //
                    //   function foo<T>() { return '' }
                    //   class C<T> { // <-- Class's own type parameter T
                    //       [foo<T>()]() { } // <-- Reference to T from class's own computed property
                    //   }
                    //
                    case 137 /* ComputedPropertyName */:
                        grandparent = location.parent.parent;
                        if (ts.isClassLike(grandparent) || grandparent.kind === 218 /* InterfaceDeclaration */) {
                            // A reference to this grandparent's type parameters would be an error
                            if (result = getSymbol(getSymbolOfNode(grandparent).members, name, meaning & 793056 /* Type */)) {
                                error(errorLocation, ts.Diagnostics.A_computed_property_name_cannot_reference_a_type_parameter_from_its_containing_type);
                                return undefined;
                            }
                        }
                        break;
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                    case 145 /* Constructor */:
                    case 146 /* GetAccessor */:
                    case 147 /* SetAccessor */:
                    case 216 /* FunctionDeclaration */:
                    case 177 /* ArrowFunction */:
                        if (meaning & 3 /* Variable */ && name === "arguments") {
                            result = argumentsSymbol;
                            break loop;
                        }
                        break;
                    case 176 /* FunctionExpression */:
                        if (meaning & 3 /* Variable */ && name === "arguments") {
                            result = argumentsSymbol;
                            break loop;
                        }
                        if (meaning & 16 /* Function */) {
                            var functionName = location.name;
                            if (functionName && name === functionName.text) {
                                result = location.symbol;
                                break loop;
                            }
                        }
                        break;
                    case 140 /* Decorator */:
                        // Decorators are resolved at the class declaration. Resolving at the parameter
                        // or member would result in looking up locals in the method.
                        //
                        //   function y() {}
                        //   class C {
                        //       method(@y x, y) {} // <-- decorator y should be resolved at the class declaration, not the parameter.
                        //   }
                        //
                        if (location.parent && location.parent.kind === 139 /* Parameter */) {
                            location = location.parent;
                        }
                        //
                        //   function y() {}
                        //   class C {
                        //       @y method(x, y) {} // <-- decorator y should be resolved at the class declaration, not the method.
                        //   }
                        //
                        if (location.parent && ts.isClassElement(location.parent)) {
                            location = location.parent;
                        }
                        break;
                }
                lastLocation = location;
                location = location.parent;
            }
            if (!result) {
                result = getSymbol(globals, name, meaning);
            }
            if (!result) {
                if (nameNotFoundMessage) {
                    if (!checkAndReportErrorForMissingPrefix(errorLocation, name, nameArg)) {
                        error(errorLocation, nameNotFoundMessage, typeof nameArg === "string" ? nameArg : ts.declarationNameToString(nameArg));
                    }
                }
                return undefined;
            }
            // Perform extra checks only if error reporting was requested
            if (nameNotFoundMessage) {
                if (propertyWithInvalidInitializer) {
                    // We have a match, but the reference occurred within a property initializer and the identifier also binds
                    // to a local variable in the constructor where the code will be emitted.
                    var propertyName = propertyWithInvalidInitializer.name;
                    error(errorLocation, ts.Diagnostics.Initializer_of_instance_member_variable_0_cannot_reference_identifier_1_declared_in_the_constructor, ts.declarationNameToString(propertyName), typeof nameArg === "string" ? nameArg : ts.declarationNameToString(nameArg));
                    return undefined;
                }
                // Only check for block-scoped variable if we are looking for the
                // name with variable meaning
                //      For example,
                //          declare module foo {
                //              interface bar {}
                //          }
                //      const foo/*1*/: foo/*2*/.bar;
                // The foo at /*1*/ and /*2*/ will share same symbol with two meaning
                // block - scope variable and namespace module. However, only when we
                // try to resolve name in /*1*/ which is used in variable position,
                // we want to check for block- scoped
                if (meaning & 2 /* BlockScopedVariable */) {
                    var exportOrLocalSymbol = getExportSymbolOfValueSymbolIfExported(result);
                    if (exportOrLocalSymbol.flags & 2 /* BlockScopedVariable */) {
                        checkResolvedBlockScopedVariable(exportOrLocalSymbol, errorLocation);
                    }
                }
            }
            return result;
        }
        function checkAndReportErrorForMissingPrefix(errorLocation, name, nameArg) {
            if (!errorLocation || (errorLocation.kind === 69 /* Identifier */ && (isTypeReferenceIdentifier(errorLocation)) || isInTypeQuery(errorLocation))) {
                return false;
            }
            var container = ts.getThisContainer(errorLocation, /* includeArrowFunctions */ true);
            var location = container;
            while (location) {
                if (ts.isClassLike(location.parent)) {
                    var classSymbol = getSymbolOfNode(location.parent);
                    if (!classSymbol) {
                        break;
                    }
                    // Check to see if a static member exists.
                    var constructorType = getTypeOfSymbol(classSymbol);
                    if (getPropertyOfType(constructorType, name)) {
                        error(errorLocation, ts.Diagnostics.Cannot_find_name_0_Did_you_mean_the_static_member_1_0, typeof nameArg === "string" ? nameArg : ts.declarationNameToString(nameArg), symbolToString(classSymbol));
                        return true;
                    }
                    // No static member is present.
                    // Check if we're in an instance method and look for a relevant instance member.
                    if (location === container && !(location.flags & 64 /* Static */)) {
                        var instanceType = getDeclaredTypeOfSymbol(classSymbol).thisType;
                        if (getPropertyOfType(instanceType, name)) {
                            error(errorLocation, ts.Diagnostics.Cannot_find_name_0_Did_you_mean_the_instance_member_this_0, typeof nameArg === "string" ? nameArg : ts.declarationNameToString(nameArg));
                            return true;
                        }
                    }
                }
                location = location.parent;
            }
            return false;
        }
        function checkResolvedBlockScopedVariable(result, errorLocation) {
            ts.Debug.assert((result.flags & 2 /* BlockScopedVariable */) !== 0);
            // Block-scoped variables cannot be used before their definition
            var declaration = ts.forEach(result.declarations, function (d) { return ts.isBlockOrCatchScoped(d) ? d : undefined; });
            ts.Debug.assert(declaration !== undefined, "Block-scoped variable declaration is undefined");
            if (!isBlockScopedNameDeclaredBeforeUse(ts.getAncestor(declaration, 214 /* VariableDeclaration */), errorLocation)) {
                error(errorLocation, ts.Diagnostics.Block_scoped_variable_0_used_before_its_declaration, ts.declarationNameToString(declaration.name));
            }
        }
        /* Starting from 'initial' node walk up the parent chain until 'stopAt' node is reached.
         * If at any point current node is equal to 'parent' node - return true.
         * Return false if 'stopAt' node is reached or isFunctionLike(current) === true.
         */
        function isSameScopeDescendentOf(initial, parent, stopAt) {
            if (!parent) {
                return false;
            }
            for (var current = initial; current && current !== stopAt && !ts.isFunctionLike(current); current = current.parent) {
                if (current === parent) {
                    return true;
                }
            }
            return false;
        }
        function getAnyImportSyntax(node) {
            if (ts.isAliasSymbolDeclaration(node)) {
                if (node.kind === 224 /* ImportEqualsDeclaration */) {
                    return node;
                }
                while (node && node.kind !== 225 /* ImportDeclaration */) {
                    node = node.parent;
                }
                return node;
            }
        }
        function getDeclarationOfAliasSymbol(symbol) {
            return ts.forEach(symbol.declarations, function (d) { return ts.isAliasSymbolDeclaration(d) ? d : undefined; });
        }
        function getTargetOfImportEqualsDeclaration(node) {
            if (node.moduleReference.kind === 235 /* ExternalModuleReference */) {
                return resolveExternalModuleSymbol(resolveExternalModuleName(node, ts.getExternalModuleImportEqualsDeclarationExpression(node)));
            }
            return getSymbolOfPartOfRightHandSideOfImportEquals(node.moduleReference, node);
        }
        function getTargetOfImportClause(node) {
            var moduleSymbol = resolveExternalModuleName(node, node.parent.moduleSpecifier);
            if (moduleSymbol) {
                var exportDefaultSymbol = resolveSymbol(moduleSymbol.exports["default"]);
                if (!exportDefaultSymbol && !allowSyntheticDefaultImports) {
                    error(node.name, ts.Diagnostics.Module_0_has_no_default_export, symbolToString(moduleSymbol));
                }
                else if (!exportDefaultSymbol && allowSyntheticDefaultImports) {
                    return resolveExternalModuleSymbol(moduleSymbol) || resolveSymbol(moduleSymbol);
                }
                return exportDefaultSymbol;
            }
        }
        function getTargetOfNamespaceImport(node) {
            var moduleSpecifier = node.parent.parent.moduleSpecifier;
            return resolveESModuleSymbol(resolveExternalModuleName(node, moduleSpecifier), moduleSpecifier);
        }
        // This function creates a synthetic symbol that combines the value side of one symbol with the
        // type/namespace side of another symbol. Consider this example:
        //
        //   declare module graphics {
        //       interface Point {
        //           x: number;
        //           y: number;
        //       }
        //   }
        //   declare var graphics: {
        //       Point: new (x: number, y: number) => graphics.Point;
        //   }
        //   declare module "graphics" {
        //       export = graphics;
        //   }
        //
        // An 'import { Point } from "graphics"' needs to create a symbol that combines the value side 'Point'
        // property with the type/namespace side interface 'Point'.
        function combineValueAndTypeSymbols(valueSymbol, typeSymbol) {
            if (valueSymbol.flags & (793056 /* Type */ | 1536 /* Namespace */)) {
                return valueSymbol;
            }
            var result = createSymbol(valueSymbol.flags | typeSymbol.flags, valueSymbol.name);
            result.declarations = ts.concatenate(valueSymbol.declarations, typeSymbol.declarations);
            result.parent = valueSymbol.parent || typeSymbol.parent;
            if (valueSymbol.valueDeclaration)
                result.valueDeclaration = valueSymbol.valueDeclaration;
            if (typeSymbol.members)
                result.members = typeSymbol.members;
            if (valueSymbol.exports)
                result.exports = valueSymbol.exports;
            return result;
        }
        function getExportOfModule(symbol, name) {
            if (symbol.flags & 1536 /* Module */) {
                var exports = getExportsOfSymbol(symbol);
                if (ts.hasProperty(exports, name)) {
                    return resolveSymbol(exports[name]);
                }
            }
        }
        function getPropertyOfVariable(symbol, name) {
            if (symbol.flags & 3 /* Variable */) {
                var typeAnnotation = symbol.valueDeclaration.type;
                if (typeAnnotation) {
                    return resolveSymbol(getPropertyOfType(getTypeFromTypeNode(typeAnnotation), name));
                }
            }
        }
        function getExternalModuleMember(node, specifier) {
            var moduleSymbol = resolveExternalModuleName(node, node.moduleSpecifier);
            var targetSymbol = resolveESModuleSymbol(moduleSymbol, node.moduleSpecifier);
            if (targetSymbol) {
                var name_1 = specifier.propertyName || specifier.name;
                if (name_1.text) {
                    var symbolFromModule = getExportOfModule(targetSymbol, name_1.text);
                    var symbolFromVariable = getPropertyOfVariable(targetSymbol, name_1.text);
                    var symbol = symbolFromModule && symbolFromVariable ?
                        combineValueAndTypeSymbols(symbolFromVariable, symbolFromModule) :
                        symbolFromModule || symbolFromVariable;
                    if (!symbol) {
                        error(name_1, ts.Diagnostics.Module_0_has_no_exported_member_1, getFullyQualifiedName(moduleSymbol), ts.declarationNameToString(name_1));
                    }
                    return symbol;
                }
            }
        }
        function getTargetOfImportSpecifier(node) {
            return getExternalModuleMember(node.parent.parent.parent, node);
        }
        function getTargetOfExportSpecifier(node) {
            return node.parent.parent.moduleSpecifier ?
                getExternalModuleMember(node.parent.parent, node) :
                resolveEntityName(node.propertyName || node.name, 107455 /* Value */ | 793056 /* Type */ | 1536 /* Namespace */);
        }
        function getTargetOfExportAssignment(node) {
            return resolveEntityName(node.expression, 107455 /* Value */ | 793056 /* Type */ | 1536 /* Namespace */);
        }
        function getTargetOfAliasDeclaration(node) {
            switch (node.kind) {
                case 224 /* ImportEqualsDeclaration */:
                    return getTargetOfImportEqualsDeclaration(node);
                case 226 /* ImportClause */:
                    return getTargetOfImportClause(node);
                case 227 /* NamespaceImport */:
                    return getTargetOfNamespaceImport(node);
                case 229 /* ImportSpecifier */:
                    return getTargetOfImportSpecifier(node);
                case 233 /* ExportSpecifier */:
                    return getTargetOfExportSpecifier(node);
                case 230 /* ExportAssignment */:
                    return getTargetOfExportAssignment(node);
            }
        }
        function resolveSymbol(symbol) {
            return symbol && symbol.flags & 8388608 /* Alias */ && !(symbol.flags & (107455 /* Value */ | 793056 /* Type */ | 1536 /* Namespace */)) ? resolveAlias(symbol) : symbol;
        }
        function resolveAlias(symbol) {
            ts.Debug.assert((symbol.flags & 8388608 /* Alias */) !== 0, "Should only get Alias here.");
            var links = getSymbolLinks(symbol);
            if (!links.target) {
                links.target = resolvingSymbol;
                var node = getDeclarationOfAliasSymbol(symbol);
                var target = getTargetOfAliasDeclaration(node);
                if (links.target === resolvingSymbol) {
                    links.target = target || unknownSymbol;
                }
                else {
                    error(node, ts.Diagnostics.Circular_definition_of_import_alias_0, symbolToString(symbol));
                }
            }
            else if (links.target === resolvingSymbol) {
                links.target = unknownSymbol;
            }
            return links.target;
        }
        function markExportAsReferenced(node) {
            var symbol = getSymbolOfNode(node);
            var target = resolveAlias(symbol);
            if (target) {
                var markAlias = (target === unknownSymbol && compilerOptions.isolatedModules) ||
                    (target !== unknownSymbol && (target.flags & 107455 /* Value */) && !isConstEnumOrConstEnumOnlyModule(target));
                if (markAlias) {
                    markAliasSymbolAsReferenced(symbol);
                }
            }
        }
        // When an alias symbol is referenced, we need to mark the entity it references as referenced and in turn repeat that until
        // we reach a non-alias or an exported entity (which is always considered referenced). We do this by checking the target of
        // the alias as an expression (which recursively takes us back here if the target references another alias).
        function markAliasSymbolAsReferenced(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.referenced) {
                links.referenced = true;
                var node = getDeclarationOfAliasSymbol(symbol);
                if (node.kind === 230 /* ExportAssignment */) {
                    // export default <symbol>
                    checkExpressionCached(node.expression);
                }
                else if (node.kind === 233 /* ExportSpecifier */) {
                    // export { <symbol> } or export { <symbol> as foo }
                    checkExpressionCached(node.propertyName || node.name);
                }
                else if (ts.isInternalModuleImportEqualsDeclaration(node)) {
                    // import foo = <symbol>
                    checkExpressionCached(node.moduleReference);
                }
            }
        }
        // This function is only for imports with entity names
        function getSymbolOfPartOfRightHandSideOfImportEquals(entityName, importDeclaration) {
            if (!importDeclaration) {
                importDeclaration = ts.getAncestor(entityName, 224 /* ImportEqualsDeclaration */);
                ts.Debug.assert(importDeclaration !== undefined);
            }
            // There are three things we might try to look for. In the following examples,
            // the search term is enclosed in |...|:
            //
            //     import a = |b|; // Namespace
            //     import a = |b.c|; // Value, type, namespace
            //     import a = |b.c|.d; // Namespace
            if (entityName.kind === 69 /* Identifier */ && ts.isRightSideOfQualifiedNameOrPropertyAccess(entityName)) {
                entityName = entityName.parent;
            }
            // Check for case 1 and 3 in the above example
            if (entityName.kind === 69 /* Identifier */ || entityName.parent.kind === 136 /* QualifiedName */) {
                return resolveEntityName(entityName, 1536 /* Namespace */);
            }
            else {
                // Case 2 in above example
                // entityName.kind could be a QualifiedName or a Missing identifier
                ts.Debug.assert(entityName.parent.kind === 224 /* ImportEqualsDeclaration */);
                return resolveEntityName(entityName, 107455 /* Value */ | 793056 /* Type */ | 1536 /* Namespace */);
            }
        }
        function getFullyQualifiedName(symbol) {
            return symbol.parent ? getFullyQualifiedName(symbol.parent) + "." + symbolToString(symbol) : symbolToString(symbol);
        }
        // Resolves a qualified name and any involved aliases
        function resolveEntityName(name, meaning, ignoreErrors) {
            if (ts.nodeIsMissing(name)) {
                return undefined;
            }
            var symbol;
            if (name.kind === 69 /* Identifier */) {
                var message = meaning === 1536 /* Namespace */ ? ts.Diagnostics.Cannot_find_namespace_0 : ts.Diagnostics.Cannot_find_name_0;
                symbol = resolveName(name, name.text, meaning, ignoreErrors ? undefined : message, name);
                if (!symbol) {
                    return undefined;
                }
            }
            else if (name.kind === 136 /* QualifiedName */ || name.kind === 169 /* PropertyAccessExpression */) {
                var left = name.kind === 136 /* QualifiedName */ ? name.left : name.expression;
                var right = name.kind === 136 /* QualifiedName */ ? name.right : name.name;
                var namespace = resolveEntityName(left, 1536 /* Namespace */, ignoreErrors);
                if (!namespace || namespace === unknownSymbol || ts.nodeIsMissing(right)) {
                    return undefined;
                }
                symbol = getSymbol(getExportsOfSymbol(namespace), right.text, meaning);
                if (!symbol) {
                    if (!ignoreErrors) {
                        error(right, ts.Diagnostics.Module_0_has_no_exported_member_1, getFullyQualifiedName(namespace), ts.declarationNameToString(right));
                    }
                    return undefined;
                }
            }
            else {
                ts.Debug.fail("Unknown entity name kind.");
            }
            ts.Debug.assert((symbol.flags & 16777216 /* Instantiated */) === 0, "Should never get an instantiated symbol here.");
            return symbol.flags & meaning ? symbol : resolveAlias(symbol);
        }
        function resolveExternalModuleName(location, moduleReferenceExpression) {
            return resolveExternalModuleNameWorker(location, moduleReferenceExpression, ts.Diagnostics.Cannot_find_module_0);
        }
        function resolveExternalModuleNameWorker(location, moduleReferenceExpression, moduleNotFoundError) {
            if (moduleReferenceExpression.kind !== 9 /* StringLiteral */) {
                return;
            }
            var moduleReferenceLiteral = moduleReferenceExpression;
            // Module names are escaped in our symbol table.  However, string literal values aren't.
            // Escape the name in the "require(...)" clause to ensure we find the right symbol.
            var moduleName = ts.escapeIdentifier(moduleReferenceLiteral.text);
            if (moduleName === undefined) {
                return;
            }
            var isRelative = ts.isExternalModuleNameRelative(moduleName);
            if (!isRelative) {
                var symbol = getSymbol(globals, "\"" + moduleName + "\"", 512 /* ValueModule */);
                if (symbol) {
                    // merged symbol is module declaration symbol combined with all augmentations
                    return getMergedSymbol(symbol);
                }
            }
            var resolvedModule = ts.getResolvedModule(ts.getSourceFileOfNode(location), moduleReferenceLiteral.text);
            var sourceFile = resolvedModule && host.getSourceFile(resolvedModule.resolvedFileName);
            if (sourceFile) {
                if (sourceFile.symbol) {
                    // merged symbol is module declaration symbol combined with all augmentations
                    return getMergedSymbol(sourceFile.symbol);
                }
                if (moduleNotFoundError) {
                    // report errors only if it was requested
                    error(moduleReferenceLiteral, ts.Diagnostics.File_0_is_not_a_module, sourceFile.fileName);
                }
                return undefined;
            }
            if (moduleNotFoundError) {
                // report errors only if it was requested
                error(moduleReferenceLiteral, moduleNotFoundError, moduleName);
            }
            return undefined;
        }
        // An external module with an 'export =' declaration resolves to the target of the 'export =' declaration,
        // and an external module with no 'export =' declaration resolves to the module itself.
        function resolveExternalModuleSymbol(moduleSymbol) {
            return moduleSymbol && getMergedSymbol(resolveSymbol(moduleSymbol.exports["export="])) || moduleSymbol;
        }
        // An external module with an 'export =' declaration may be referenced as an ES6 module provided the 'export ='
        // references a symbol that is at least declared as a module or a variable. The target of the 'export =' may
        // combine other declarations with the module or variable (e.g. a class/module, function/module, interface/variable).
        function resolveESModuleSymbol(moduleSymbol, moduleReferenceExpression) {
            var symbol = resolveExternalModuleSymbol(moduleSymbol);
            if (symbol && !(symbol.flags & (1536 /* Module */ | 3 /* Variable */))) {
                error(moduleReferenceExpression, ts.Diagnostics.Module_0_resolves_to_a_non_module_entity_and_cannot_be_imported_using_this_construct, symbolToString(moduleSymbol));
                symbol = undefined;
            }
            return symbol;
        }
        function hasExportAssignmentSymbol(moduleSymbol) {
            return moduleSymbol.exports["export="] !== undefined;
        }
        function getExportsOfModuleAsArray(moduleSymbol) {
            return symbolsToArray(getExportsOfModule(moduleSymbol));
        }
        function getExportsOfSymbol(symbol) {
            return symbol.flags & 1536 /* Module */ ? getExportsOfModule(symbol) : symbol.exports || emptySymbols;
        }
        function getExportsOfModule(moduleSymbol) {
            var links = getSymbolLinks(moduleSymbol);
            return links.resolvedExports || (links.resolvedExports = getExportsForModule(moduleSymbol));
        }
        /**
         * Extends one symbol table with another while collecting information on name collisions for error message generation into the `lookupTable` argument
         * Not passing `lookupTable` and `exportNode` disables this collection, and just extends the tables
         */
        function extendExportSymbols(target, source, lookupTable, exportNode) {
            for (var id in source) {
                if (id !== "default" && !ts.hasProperty(target, id)) {
                    target[id] = source[id];
                    if (lookupTable && exportNode) {
                        lookupTable[id] = {
                            specifierText: ts.getTextOfNode(exportNode.moduleSpecifier)
                        };
                    }
                }
                else if (lookupTable && exportNode && id !== "default" && ts.hasProperty(target, id) && resolveSymbol(target[id]) !== resolveSymbol(source[id])) {
                    if (!lookupTable[id].exportsWithDuplicate) {
                        lookupTable[id].exportsWithDuplicate = [exportNode];
                    }
                    else {
                        lookupTable[id].exportsWithDuplicate.push(exportNode);
                    }
                }
            }
        }
        function getExportsForModule(moduleSymbol) {
            var visitedSymbols = [];
            return visit(moduleSymbol) || moduleSymbol.exports;
            // The ES6 spec permits export * declarations in a module to circularly reference the module itself. For example,
            // module 'a' can 'export * from "b"' and 'b' can 'export * from "a"' without error.
            function visit(symbol) {
                if (!(symbol && symbol.flags & 1952 /* HasExports */ && !ts.contains(visitedSymbols, symbol))) {
                    return;
                }
                visitedSymbols.push(symbol);
                var symbols = cloneSymbolTable(symbol.exports);
                // All export * declarations are collected in an __export symbol by the binder
                var exportStars = symbol.exports["__export"];
                if (exportStars) {
                    var nestedSymbols = {};
                    var lookupTable = {};
                    for (var _i = 0, _a = exportStars.declarations; _i < _a.length; _i++) {
                        var node = _a[_i];
                        var resolvedModule = resolveExternalModuleName(node, node.moduleSpecifier);
                        var exportedSymbols = visit(resolvedModule);
                        extendExportSymbols(nestedSymbols, exportedSymbols, lookupTable, node);
                    }
                    for (var id in lookupTable) {
                        var exportsWithDuplicate = lookupTable[id].exportsWithDuplicate;
                        // It's not an error if the file with multiple `export *`s with duplicate names exports a member with that name itself
                        if (id === "export=" || !(exportsWithDuplicate && exportsWithDuplicate.length) || ts.hasProperty(symbols, id)) {
                            continue;
                        }
                        for (var _b = 0, exportsWithDuplicate_1 = exportsWithDuplicate; _b < exportsWithDuplicate_1.length; _b++) {
                            var node = exportsWithDuplicate_1[_b];
                            diagnostics.add(ts.createDiagnosticForNode(node, ts.Diagnostics.Module_0_has_already_exported_a_member_named_1_Consider_explicitly_re_exporting_to_resolve_the_ambiguity, lookupTable[id].specifierText, id));
                        }
                    }
                    extendExportSymbols(symbols, nestedSymbols);
                }
                return symbols;
            }
        }
        function getMergedSymbol(symbol) {
            var merged;
            return symbol && symbol.mergeId && (merged = mergedSymbols[symbol.mergeId]) ? merged : symbol;
        }
        function getSymbolOfNode(node) {
            return getMergedSymbol(node.symbol);
        }
        function getParentOfSymbol(symbol) {
            return getMergedSymbol(symbol.parent);
        }
        function getExportSymbolOfValueSymbolIfExported(symbol) {
            return symbol && (symbol.flags & 1048576 /* ExportValue */) !== 0
                ? getMergedSymbol(symbol.exportSymbol)
                : symbol;
        }
        function symbolIsValue(symbol) {
            // If it is an instantiated symbol, then it is a value if the symbol it is an
            // instantiation of is a value.
            if (symbol.flags & 16777216 /* Instantiated */) {
                return symbolIsValue(getSymbolLinks(symbol).target);
            }
            // If the symbol has the value flag, it is trivially a value.
            if (symbol.flags & 107455 /* Value */) {
                return true;
            }
            // If it is an alias, then it is a value if the symbol it resolves to is a value.
            if (symbol.flags & 8388608 /* Alias */) {
                return (resolveAlias(symbol).flags & 107455 /* Value */) !== 0;
            }
            return false;
        }
        function findConstructorDeclaration(node) {
            var members = node.members;
            for (var _i = 0, members_1 = members; _i < members_1.length; _i++) {
                var member = members_1[_i];
                if (member.kind === 145 /* Constructor */ && ts.nodeIsPresent(member.body)) {
                    return member;
                }
            }
        }
        function createType(flags) {
            var result = new Type(checker, flags);
            result.id = typeCount;
            typeCount++;
            return result;
        }
        function createIntrinsicType(kind, intrinsicName) {
            var type = createType(kind);
            type.intrinsicName = intrinsicName;
            return type;
        }
        function createObjectType(kind, symbol) {
            var type = createType(kind);
            type.symbol = symbol;
            return type;
        }
        // A reserved member name starts with two underscores, but the third character cannot be an underscore
        // or the @ symbol. A third underscore indicates an escaped form of an identifer that started
        // with at least two underscores. The @ character indicates that the name is denoted by a well known ES
        // Symbol instance.
        function isReservedMemberName(name) {
            return name.charCodeAt(0) === 95 /* _ */ &&
                name.charCodeAt(1) === 95 /* _ */ &&
                name.charCodeAt(2) !== 95 /* _ */ &&
                name.charCodeAt(2) !== 64 /* at */;
        }
        function getNamedMembers(members) {
            var result;
            for (var id in members) {
                if (ts.hasProperty(members, id)) {
                    if (!isReservedMemberName(id)) {
                        if (!result)
                            result = [];
                        var symbol = members[id];
                        if (symbolIsValue(symbol)) {
                            result.push(symbol);
                        }
                    }
                }
            }
            return result || emptyArray;
        }
        function setObjectTypeMembers(type, members, callSignatures, constructSignatures, stringIndexType, numberIndexType) {
            type.members = members;
            type.properties = getNamedMembers(members);
            type.callSignatures = callSignatures;
            type.constructSignatures = constructSignatures;
            if (stringIndexType)
                type.stringIndexType = stringIndexType;
            if (numberIndexType)
                type.numberIndexType = numberIndexType;
            return type;
        }
        function createAnonymousType(symbol, members, callSignatures, constructSignatures, stringIndexType, numberIndexType) {
            return setObjectTypeMembers(createObjectType(65536 /* Anonymous */, symbol), members, callSignatures, constructSignatures, stringIndexType, numberIndexType);
        }
        function forEachSymbolTableInScope(enclosingDeclaration, callback) {
            var result;
            for (var location_1 = enclosingDeclaration; location_1; location_1 = location_1.parent) {
                // Locals of a source file are not in scope (because they get merged into the global symbol table)
                if (location_1.locals && !isGlobalSourceFile(location_1)) {
                    if (result = callback(location_1.locals)) {
                        return result;
                    }
                }
                switch (location_1.kind) {
                    case 251 /* SourceFile */:
                        if (!ts.isExternalOrCommonJsModule(location_1)) {
                            break;
                        }
                    case 221 /* ModuleDeclaration */:
                        if (result = callback(getSymbolOfNode(location_1).exports)) {
                            return result;
                        }
                        break;
                    case 217 /* ClassDeclaration */:
                    case 218 /* InterfaceDeclaration */:
                        if (result = callback(getSymbolOfNode(location_1).members)) {
                            return result;
                        }
                        break;
                }
            }
            return callback(globals);
        }
        function getQualifiedLeftMeaning(rightMeaning) {
            // If we are looking in value space, the parent meaning is value, other wise it is namespace
            return rightMeaning === 107455 /* Value */ ? 107455 /* Value */ : 1536 /* Namespace */;
        }
        function getAccessibleSymbolChain(symbol, enclosingDeclaration, meaning, useOnlyExternalAliasing) {
            function getAccessibleSymbolChainFromSymbolTable(symbols) {
                function canQualifySymbol(symbolFromSymbolTable, meaning) {
                    // If the symbol is equivalent and doesn't need further qualification, this symbol is accessible
                    if (!needsQualification(symbolFromSymbolTable, enclosingDeclaration, meaning)) {
                        return true;
                    }
                    // If symbol needs qualification, make sure that parent is accessible, if it is then this symbol is accessible too
                    var accessibleParent = getAccessibleSymbolChain(symbolFromSymbolTable.parent, enclosingDeclaration, getQualifiedLeftMeaning(meaning), useOnlyExternalAliasing);
                    return !!accessibleParent;
                }
                function isAccessible(symbolFromSymbolTable, resolvedAliasSymbol) {
                    if (symbol === (resolvedAliasSymbol || symbolFromSymbolTable)) {
                        // if the symbolFromSymbolTable is not external module (it could be if it was determined as ambient external module and would be in globals table)
                        // and if symbolfrom symbolTable or alias resolution matches the symbol,
                        // check the symbol can be qualified, it is only then this symbol is accessible
                        return !ts.forEach(symbolFromSymbolTable.declarations, hasExternalModuleSymbol) &&
                            canQualifySymbol(symbolFromSymbolTable, meaning);
                    }
                }
                // If symbol is directly available by its name in the symbol table
                if (isAccessible(ts.lookUp(symbols, symbol.name))) {
                    return [symbol];
                }
                // Check if symbol is any of the alias
                return ts.forEachValue(symbols, function (symbolFromSymbolTable) {
                    if (symbolFromSymbolTable.flags & 8388608 /* Alias */
                        && symbolFromSymbolTable.name !== "export="
                        && !ts.getDeclarationOfKind(symbolFromSymbolTable, 233 /* ExportSpecifier */)) {
                        if (!useOnlyExternalAliasing ||
                            // Is this external alias, then use it to name
                            ts.forEach(symbolFromSymbolTable.declarations, ts.isExternalModuleImportEqualsDeclaration)) {
                            var resolvedImportedSymbol = resolveAlias(symbolFromSymbolTable);
                            if (isAccessible(symbolFromSymbolTable, resolveAlias(symbolFromSymbolTable))) {
                                return [symbolFromSymbolTable];
                            }
                            // Look in the exported members, if we can find accessibleSymbolChain, symbol is accessible using this chain
                            // but only if the symbolFromSymbolTable can be qualified
                            var accessibleSymbolsFromExports = resolvedImportedSymbol.exports ? getAccessibleSymbolChainFromSymbolTable(resolvedImportedSymbol.exports) : undefined;
                            if (accessibleSymbolsFromExports && canQualifySymbol(symbolFromSymbolTable, getQualifiedLeftMeaning(meaning))) {
                                return [symbolFromSymbolTable].concat(accessibleSymbolsFromExports);
                            }
                        }
                    }
                });
            }
            if (symbol) {
                return forEachSymbolTableInScope(enclosingDeclaration, getAccessibleSymbolChainFromSymbolTable);
            }
        }
        function needsQualification(symbol, enclosingDeclaration, meaning) {
            var qualify = false;
            forEachSymbolTableInScope(enclosingDeclaration, function (symbolTable) {
                // If symbol of this name is not available in the symbol table we are ok
                if (!ts.hasProperty(symbolTable, symbol.name)) {
                    // Continue to the next symbol table
                    return false;
                }
                // If the symbol with this name is present it should refer to the symbol
                var symbolFromSymbolTable = symbolTable[symbol.name];
                if (symbolFromSymbolTable === symbol) {
                    // No need to qualify
                    return true;
                }
                // Qualify if the symbol from symbol table has same meaning as expected
                symbolFromSymbolTable = (symbolFromSymbolTable.flags & 8388608 /* Alias */ && !ts.getDeclarationOfKind(symbolFromSymbolTable, 233 /* ExportSpecifier */)) ? resolveAlias(symbolFromSymbolTable) : symbolFromSymbolTable;
                if (symbolFromSymbolTable.flags & meaning) {
                    qualify = true;
                    return true;
                }
                // Continue to the next symbol table
                return false;
            });
            return qualify;
        }
        function isSymbolAccessible(symbol, enclosingDeclaration, meaning) {
            if (symbol && enclosingDeclaration && !(symbol.flags & 262144 /* TypeParameter */)) {
                var initialSymbol = symbol;
                var meaningToLook = meaning;
                while (symbol) {
                    // Symbol is accessible if it by itself is accessible
                    var accessibleSymbolChain = getAccessibleSymbolChain(symbol, enclosingDeclaration, meaningToLook, /*useOnlyExternalAliasing*/ false);
                    if (accessibleSymbolChain) {
                        var hasAccessibleDeclarations = hasVisibleDeclarations(accessibleSymbolChain[0]);
                        if (!hasAccessibleDeclarations) {
                            return {
                                accessibility: 1 /* NotAccessible */,
                                errorSymbolName: symbolToString(initialSymbol, enclosingDeclaration, meaning),
                                errorModuleName: symbol !== initialSymbol ? symbolToString(symbol, enclosingDeclaration, 1536 /* Namespace */) : undefined
                            };
                        }
                        return hasAccessibleDeclarations;
                    }
                    // If we haven't got the accessible symbol, it doesn't mean the symbol is actually inaccessible.
                    // It could be a qualified symbol and hence verify the path
                    // e.g.:
                    // module m {
                    //     export class c {
                    //     }
                    // }
                    // const x: typeof m.c
                    // In the above example when we start with checking if typeof m.c symbol is accessible,
                    // we are going to see if c can be accessed in scope directly.
                    // But it can't, hence the accessible is going to be undefined, but that doesn't mean m.c is inaccessible
                    // It is accessible if the parent m is accessible because then m.c can be accessed through qualification
                    meaningToLook = getQualifiedLeftMeaning(meaning);
                    symbol = getParentOfSymbol(symbol);
                }
                // This could be a symbol that is not exported in the external module
                // or it could be a symbol from different external module that is not aliased and hence cannot be named
                var symbolExternalModule = ts.forEach(initialSymbol.declarations, getExternalModuleContainer);
                if (symbolExternalModule) {
                    var enclosingExternalModule = getExternalModuleContainer(enclosingDeclaration);
                    if (symbolExternalModule !== enclosingExternalModule) {
                        // name from different external module that is not visible
                        return {
                            accessibility: 2 /* CannotBeNamed */,
                            errorSymbolName: symbolToString(initialSymbol, enclosingDeclaration, meaning),
                            errorModuleName: symbolToString(symbolExternalModule)
                        };
                    }
                }
                // Just a local name that is not accessible
                return {
                    accessibility: 1 /* NotAccessible */,
                    errorSymbolName: symbolToString(initialSymbol, enclosingDeclaration, meaning)
                };
            }
            return { accessibility: 0 /* Accessible */ };
            function getExternalModuleContainer(declaration) {
                for (; declaration; declaration = declaration.parent) {
                    if (hasExternalModuleSymbol(declaration)) {
                        return getSymbolOfNode(declaration);
                    }
                }
            }
        }
        function hasExternalModuleSymbol(declaration) {
            return ts.isAmbientModule(declaration) || (declaration.kind === 251 /* SourceFile */ && ts.isExternalOrCommonJsModule(declaration));
        }
        function hasVisibleDeclarations(symbol) {
            var aliasesToMakeVisible;
            if (ts.forEach(symbol.declarations, function (declaration) { return !getIsDeclarationVisible(declaration); })) {
                return undefined;
            }
            return { accessibility: 0 /* Accessible */, aliasesToMakeVisible: aliasesToMakeVisible };
            function getIsDeclarationVisible(declaration) {
                if (!isDeclarationVisible(declaration)) {
                    // Mark the unexported alias as visible if its parent is visible
                    // because these kind of aliases can be used to name types in declaration file
                    var anyImportSyntax = getAnyImportSyntax(declaration);
                    if (anyImportSyntax &&
                        !(anyImportSyntax.flags & 2 /* Export */) &&
                        isDeclarationVisible(anyImportSyntax.parent)) {
                        getNodeLinks(declaration).isVisible = true;
                        if (aliasesToMakeVisible) {
                            if (!ts.contains(aliasesToMakeVisible, anyImportSyntax)) {
                                aliasesToMakeVisible.push(anyImportSyntax);
                            }
                        }
                        else {
                            aliasesToMakeVisible = [anyImportSyntax];
                        }
                        return true;
                    }
                    // Declaration is not visible
                    return false;
                }
                return true;
            }
        }
        function isEntityNameVisible(entityName, enclosingDeclaration) {
            // get symbol of the first identifier of the entityName
            var meaning;
            if (entityName.parent.kind === 155 /* TypeQuery */) {
                // Typeof value
                meaning = 107455 /* Value */ | 1048576 /* ExportValue */;
            }
            else if (entityName.kind === 136 /* QualifiedName */ || entityName.kind === 169 /* PropertyAccessExpression */ ||
                entityName.parent.kind === 224 /* ImportEqualsDeclaration */) {
                // Left identifier from type reference or TypeAlias
                // Entity name of the import declaration
                meaning = 1536 /* Namespace */;
            }
            else {
                // Type Reference or TypeAlias entity = Identifier
                meaning = 793056 /* Type */;
            }
            var firstIdentifier = getFirstIdentifier(entityName);
            var symbol = resolveName(enclosingDeclaration, firstIdentifier.text, meaning, /*nodeNotFoundErrorMessage*/ undefined, /*nameArg*/ undefined);
            // Verify if the symbol is accessible
            return (symbol && hasVisibleDeclarations(symbol)) || {
                accessibility: 1 /* NotAccessible */,
                errorSymbolName: ts.getTextOfNode(firstIdentifier),
                errorNode: firstIdentifier
            };
        }
        function writeKeyword(writer, kind) {
            writer.writeKeyword(ts.tokenToString(kind));
        }
        function writePunctuation(writer, kind) {
            writer.writePunctuation(ts.tokenToString(kind));
        }
        function writeSpace(writer) {
            writer.writeSpace(" ");
        }
        function symbolToString(symbol, enclosingDeclaration, meaning) {
            var writer = ts.getSingleLineStringWriter();
            getSymbolDisplayBuilder().buildSymbolDisplay(symbol, writer, enclosingDeclaration, meaning);
            var result = writer.string();
            ts.releaseStringWriter(writer);
            return result;
        }
        function signatureToString(signature, enclosingDeclaration, flags, kind) {
            var writer = ts.getSingleLineStringWriter();
            getSymbolDisplayBuilder().buildSignatureDisplay(signature, writer, enclosingDeclaration, flags, kind);
            var result = writer.string();
            ts.releaseStringWriter(writer);
            return result;
        }
        function typeToString(type, enclosingDeclaration, flags) {
            var writer = ts.getSingleLineStringWriter();
            getSymbolDisplayBuilder().buildTypeDisplay(type, writer, enclosingDeclaration, flags);
            var result = writer.string();
            ts.releaseStringWriter(writer);
            var maxLength = compilerOptions.noErrorTruncation || flags & 4 /* NoTruncation */ ? undefined : 100;
            if (maxLength && result.length >= maxLength) {
                result = result.substr(0, maxLength - "...".length) + "...";
            }
            return result;
        }
        function typePredicateToString(typePredicate, enclosingDeclaration, flags) {
            var writer = ts.getSingleLineStringWriter();
            getSymbolDisplayBuilder().buildTypePredicateDisplay(typePredicate, writer, enclosingDeclaration, flags);
            var result = writer.string();
            ts.releaseStringWriter(writer);
            return result;
        }
        function getTypeAliasForTypeLiteral(type) {
            if (type.symbol && type.symbol.flags & 2048 /* TypeLiteral */) {
                var node = type.symbol.declarations[0].parent;
                while (node.kind === 161 /* ParenthesizedType */) {
                    node = node.parent;
                }
                if (node.kind === 219 /* TypeAliasDeclaration */) {
                    return getSymbolOfNode(node);
                }
            }
            return undefined;
        }
        function isTopLevelInExternalModuleAugmentation(node) {
            return node && node.parent &&
                node.parent.kind === 222 /* ModuleBlock */ &&
                ts.isExternalModuleAugmentation(node.parent.parent);
        }
        function getSymbolDisplayBuilder() {
            function getNameOfSymbol(symbol) {
                if (symbol.declarations && symbol.declarations.length) {
                    var declaration = symbol.declarations[0];
                    if (declaration.name) {
                        return ts.declarationNameToString(declaration.name);
                    }
                    switch (declaration.kind) {
                        case 189 /* ClassExpression */:
                            return "(Anonymous class)";
                        case 176 /* FunctionExpression */:
                        case 177 /* ArrowFunction */:
                            return "(Anonymous function)";
                    }
                }
                return symbol.name;
            }
            /**
             * Writes only the name of the symbol out to the writer. Uses the original source text
             * for the name of the symbol if it is available to match how the user inputted the name.
             */
            function appendSymbolNameOnly(symbol, writer) {
                writer.writeSymbol(getNameOfSymbol(symbol), symbol);
            }
            /**
             * Enclosing declaration is optional when we don't want to get qualified name in the enclosing declaration scope
             * Meaning needs to be specified if the enclosing declaration is given
             */
            function buildSymbolDisplay(symbol, writer, enclosingDeclaration, meaning, flags, typeFlags) {
                var parentSymbol;
                function appendParentTypeArgumentsAndSymbolName(symbol) {
                    if (parentSymbol) {
                        // Write type arguments of instantiated class/interface here
                        if (flags & 1 /* WriteTypeParametersOrArguments */) {
                            if (symbol.flags & 16777216 /* Instantiated */) {
                                buildDisplayForTypeArgumentsAndDelimiters(getTypeParametersOfClassOrInterface(parentSymbol), symbol.mapper, writer, enclosingDeclaration);
                            }
                            else {
                                buildTypeParameterDisplayFromSymbol(parentSymbol, writer, enclosingDeclaration);
                            }
                        }
                        writePunctuation(writer, 21 /* DotToken */);
                    }
                    parentSymbol = symbol;
                    appendSymbolNameOnly(symbol, writer);
                    // nbts: Parent may actually be an alias to a class/interface, not a
                    // class/interface itself (TS issue #5464)
                    if ((parentSymbol.flags & (8388608 /* Alias */ | 32 /* Class */ | 64 /* Interface */))
                        === 8388608 /* Alias */) {
                        parentSymbol = resolveAlias(parentSymbol);
                    }
                }
                // const the writer know we just wrote out a symbol.  The declaration emitter writer uses
                // this to determine if an import it has previously seen (and not written out) needs
                // to be written to the file once the walk of the tree is complete.
                //
                // NOTE(cyrusn): This approach feels somewhat unfortunate.  A simple pass over the tree
                // up front (for example, during checking) could determine if we need to emit the imports
                // and we could then access that data during declaration emit.
                writer.trackSymbol(symbol, enclosingDeclaration, meaning);
                function walkSymbol(symbol, meaning) {
                    if (symbol) {
                        var accessibleSymbolChain = getAccessibleSymbolChain(symbol, enclosingDeclaration, meaning, !!(flags & 2 /* UseOnlyExternalAliasing */));
                        if (!accessibleSymbolChain ||
                            needsQualification(accessibleSymbolChain[0], enclosingDeclaration, accessibleSymbolChain.length === 1 ? meaning : getQualifiedLeftMeaning(meaning))) {
                            // Go up and add our parent.
                            walkSymbol(getParentOfSymbol(accessibleSymbolChain ? accessibleSymbolChain[0] : symbol), getQualifiedLeftMeaning(meaning));
                        }
                        if (accessibleSymbolChain) {
                            for (var _i = 0, accessibleSymbolChain_1 = accessibleSymbolChain; _i < accessibleSymbolChain_1.length; _i++) {
                                var accessibleSymbol = accessibleSymbolChain_1[_i];
                                appendParentTypeArgumentsAndSymbolName(accessibleSymbol);
                            }
                        }
                        else {
                            // If we didn't find accessible symbol chain for this symbol, break if this is external module
                            if (!parentSymbol && ts.forEach(symbol.declarations, hasExternalModuleSymbol)) {
                                return;
                            }
                            // if this is anonymous type break
                            if (symbol.flags & 2048 /* TypeLiteral */ || symbol.flags & 4096 /* ObjectLiteral */) {
                                return;
                            }
                            appendParentTypeArgumentsAndSymbolName(symbol);
                        }
                    }
                }
                // Get qualified name if the symbol is not a type parameter
                // and there is an enclosing declaration or we specifically
                // asked for it
                var isTypeParameter = symbol.flags & 262144 /* TypeParameter */;
                var typeFormatFlag = 128 /* UseFullyQualifiedType */ & typeFlags;
                if (!isTypeParameter && (enclosingDeclaration || typeFormatFlag)) {
                    walkSymbol(symbol, meaning);
                    return;
                }
                return appendParentTypeArgumentsAndSymbolName(symbol);
            }
            function buildTypeDisplay(type, writer, enclosingDeclaration, globalFlags, symbolStack) {
                var globalFlagsToPass = globalFlags & 16 /* WriteOwnNameForAnyLike */;
                var inObjectTypeLiteral = false;
                return writeType(type, globalFlags);
                function writeType(type, flags) {
                    // Write undefined/null type as any
                    if (type.flags & 16777343 /* Intrinsic */) {
                        // Special handling for unknown / resolving types, they should show up as any and not unknown or __resolving
                        writer.writeKeyword(!(globalFlags & 16 /* WriteOwnNameForAnyLike */) && isTypeAny(type)
                            ? "any"
                            : type.intrinsicName);
                    }
                    else if (type.flags & 33554432 /* ThisType */) {
                        if (inObjectTypeLiteral) {
                            writer.reportInaccessibleThisError();
                        }
                        writer.writeKeyword("this");
                    }
                    else if (type.flags & 4096 /* Reference */) {
                        writeTypeReference(type, flags);
                    }
                    else if (type.flags & (1024 /* Class */ | 2048 /* Interface */ | 128 /* Enum */ | 512 /* TypeParameter */)) {
                        // The specified symbol flags need to be reinterpreted as type flags
                        buildSymbolDisplay(type.symbol, writer, enclosingDeclaration, 793056 /* Type */, 0 /* None */, flags);
                    }
                    else if (type.flags & 8192 /* Tuple */) {
                        writeTupleType(type);
                    }
                    else if (type.flags & 49152 /* UnionOrIntersection */) {
                        writeUnionOrIntersectionType(type, flags);
                    }
                    else if (type.flags & 65536 /* Anonymous */) {
                        writeAnonymousType(type, flags);
                    }
                    else if (type.flags & 256 /* StringLiteral */) {
                        writer.writeStringLiteral("\"" + ts.escapeString(type.text) + "\"");
                    }
                    else {
                        // Should never get here
                        // { ... }
                        writePunctuation(writer, 15 /* OpenBraceToken */);
                        writeSpace(writer);
                        writePunctuation(writer, 22 /* DotDotDotToken */);
                        writeSpace(writer);
                        writePunctuation(writer, 16 /* CloseBraceToken */);
                    }
                }
                function writeTypeList(types, delimiter) {
                    for (var i = 0; i < types.length; i++) {
                        if (i > 0) {
                            if (delimiter !== 24 /* CommaToken */) {
                                writeSpace(writer);
                            }
                            writePunctuation(writer, delimiter);
                            writeSpace(writer);
                        }
                        writeType(types[i], delimiter === 24 /* CommaToken */ ? 0 /* None */ : 64 /* InElementType */);
                    }
                }
                function writeSymbolTypeReference(symbol, typeArguments, pos, end, flags) {
                    // Unnamed function expressions and arrow functions have reserved names that we don't want to display
                    if (symbol.flags & 32 /* Class */ || !isReservedMemberName(symbol.name)) {
                        buildSymbolDisplay(symbol, writer, enclosingDeclaration, 793056 /* Type */, 0 /* None */, flags);
                    }
                    if (pos < end) {
                        writePunctuation(writer, 25 /* LessThanToken */);
                        writeType(typeArguments[pos], 0 /* None */);
                        pos++;
                        while (pos < end) {
                            writePunctuation(writer, 24 /* CommaToken */);
                            writeSpace(writer);
                            writeType(typeArguments[pos], 0 /* None */);
                            pos++;
                        }
                        writePunctuation(writer, 27 /* GreaterThanToken */);
                    }
                }
                function writeTypeReference(type, flags) {
                    var typeArguments = type.typeArguments || emptyArray;
                    if (type.target === globalArrayType && !(flags & 1 /* WriteArrayAsGenericType */)) {
                        writeType(typeArguments[0], 64 /* InElementType */);
                        writePunctuation(writer, 19 /* OpenBracketToken */);
                        writePunctuation(writer, 20 /* CloseBracketToken */);
                    }
                    else {
                        // Write the type reference in the format f<A>.g<B>.C<X, Y> where A and B are type arguments
                        // for outer type parameters, and f and g are the respective declaring containers of those
                        // type parameters.
                        var outerTypeParameters = type.target.outerTypeParameters;
                        var i = 0;
                        if (outerTypeParameters) {
                            var length_1 = outerTypeParameters.length;
                            while (i < length_1) {
                                // Find group of type arguments for type parameters with the same declaring container.
                                var start = i;
                                var parent_1 = getParentSymbolOfTypeParameter(outerTypeParameters[i]);
                                do {
                                    i++;
                                } while (i < length_1 && getParentSymbolOfTypeParameter(outerTypeParameters[i]) === parent_1);
                                // When type parameters are their own type arguments for the whole group (i.e. we have
                                // the default outer type arguments), we don't show the group.
                                if (!ts.rangeEquals(outerTypeParameters, typeArguments, start, i)) {
                                    writeSymbolTypeReference(parent_1, typeArguments, start, i, flags);
                                    writePunctuation(writer, 21 /* DotToken */);
                                }
                            }
                        }
                        var typeParameterCount = (type.target.typeParameters || emptyArray).length;
                        writeSymbolTypeReference(type.symbol, typeArguments, i, typeParameterCount, flags);
                    }
                }
                function writeTupleType(type) {
                    writePunctuation(writer, 19 /* OpenBracketToken */);
                    writeTypeList(type.elementTypes, 24 /* CommaToken */);
                    writePunctuation(writer, 20 /* CloseBracketToken */);
                }
                function writeUnionOrIntersectionType(type, flags) {
                    if (flags & 64 /* InElementType */) {
                        writePunctuation(writer, 17 /* OpenParenToken */);
                    }
                    writeTypeList(type.types, type.flags & 16384 /* Union */ ? 47 /* BarToken */ : 46 /* AmpersandToken */);
                    if (flags & 64 /* InElementType */) {
                        writePunctuation(writer, 18 /* CloseParenToken */);
                    }
                }
                function writeAnonymousType(type, flags) {
                    var symbol = type.symbol;
                    if (symbol) {
                        // Always use 'typeof T' for type of class, enum, and module objects
                        if (symbol.flags & (32 /* Class */ | 384 /* Enum */ | 512 /* ValueModule */)) {
                            writeTypeofSymbol(type, flags);
                        }
                        else if (shouldWriteTypeOfFunctionSymbol()) {
                            writeTypeofSymbol(type, flags);
                        }
                        else if (ts.contains(symbolStack, symbol)) {
                            // If type is an anonymous type literal in a type alias declaration, use type alias name
                            var typeAlias = getTypeAliasForTypeLiteral(type);
                            if (typeAlias) {
                                // The specified symbol flags need to be reinterpreted as type flags
                                buildSymbolDisplay(typeAlias, writer, enclosingDeclaration, 793056 /* Type */, 0 /* None */, flags);
                            }
                            else {
                                // Recursive usage, use any
                                writeKeyword(writer, 117 /* AnyKeyword */);
                            }
                        }
                        else {
                            // Since instantiations of the same anonymous type have the same symbol, tracking symbols instead
                            // of types allows us to catch circular references to instantiations of the same anonymous type
                            if (!symbolStack) {
                                symbolStack = [];
                            }
                            symbolStack.push(symbol);
                            writeLiteralType(type, flags);
                            symbolStack.pop();
                        }
                    }
                    else {
                        // Anonymous types with no symbol are never circular
                        writeLiteralType(type, flags);
                    }
                    function shouldWriteTypeOfFunctionSymbol() {
                        var isStaticMethodSymbol = !!(symbol.flags & 8192 /* Method */ &&
                            ts.forEach(symbol.declarations, function (declaration) { return declaration.flags & 64 /* Static */; }));
                        var isNonLocalFunctionSymbol = !!(symbol.flags & 16 /* Function */) &&
                            (symbol.parent ||
                                ts.forEach(symbol.declarations, function (declaration) {
                                    return declaration.parent.kind === 251 /* SourceFile */ || declaration.parent.kind === 222 /* ModuleBlock */;
                                }));
                        if (isStaticMethodSymbol || isNonLocalFunctionSymbol) {
                            // typeof is allowed only for static/non local functions
                            return !!(flags & 2 /* UseTypeOfFunction */) ||
                                (ts.contains(symbolStack, symbol)); // it is type of the symbol uses itself recursively
                        }
                    }
                }
                function writeTypeofSymbol(type, typeFormatFlags) {
                    writeKeyword(writer, 101 /* TypeOfKeyword */);
                    writeSpace(writer);
                    buildSymbolDisplay(type.symbol, writer, enclosingDeclaration, 107455 /* Value */, 0 /* None */, typeFormatFlags);
                }
                function getIndexerParameterName(type, indexKind, fallbackName) {
                    var declaration = getIndexDeclarationOfSymbol(type.symbol, indexKind);
                    if (!declaration) {
                        // declaration might not be found if indexer was added from the contextual type.
                        // in this case use fallback name
                        return fallbackName;
                    }
                    ts.Debug.assert(declaration.parameters.length !== 0);
                    return ts.declarationNameToString(declaration.parameters[0].name);
                }
                function writeLiteralType(type, flags) {
                    var resolved = resolveStructuredTypeMembers(type);
                    if (!resolved.properties.length && !resolved.stringIndexType && !resolved.numberIndexType) {
                        if (!resolved.callSignatures.length && !resolved.constructSignatures.length) {
                            writePunctuation(writer, 15 /* OpenBraceToken */);
                            writePunctuation(writer, 16 /* CloseBraceToken */);
                            return;
                        }
                        if (resolved.callSignatures.length === 1 && !resolved.constructSignatures.length) {
                            if (flags & 64 /* InElementType */) {
                                writePunctuation(writer, 17 /* OpenParenToken */);
                            }
                            buildSignatureDisplay(resolved.callSignatures[0], writer, enclosingDeclaration, globalFlagsToPass | 8 /* WriteArrowStyleSignature */, /*kind*/ undefined, symbolStack);
                            if (flags & 64 /* InElementType */) {
                                writePunctuation(writer, 18 /* CloseParenToken */);
                            }
                            return;
                        }
                        if (resolved.constructSignatures.length === 1 && !resolved.callSignatures.length) {
                            if (flags & 64 /* InElementType */) {
                                writePunctuation(writer, 17 /* OpenParenToken */);
                            }
                            writeKeyword(writer, 92 /* NewKeyword */);
                            writeSpace(writer);
                            buildSignatureDisplay(resolved.constructSignatures[0], writer, enclosingDeclaration, globalFlagsToPass | 8 /* WriteArrowStyleSignature */, /*kind*/ undefined, symbolStack);
                            if (flags & 64 /* InElementType */) {
                                writePunctuation(writer, 18 /* CloseParenToken */);
                            }
                            return;
                        }
                    }
                    var saveInObjectTypeLiteral = inObjectTypeLiteral;
                    inObjectTypeLiteral = true;
                    writePunctuation(writer, 15 /* OpenBraceToken */);
                    writer.writeLine();
                    writer.increaseIndent();
                    for (var _i = 0, _a = resolved.callSignatures; _i < _a.length; _i++) {
                        var signature = _a[_i];
                        buildSignatureDisplay(signature, writer, enclosingDeclaration, globalFlagsToPass, /*kind*/ undefined, symbolStack);
                        writePunctuation(writer, 23 /* SemicolonToken */);
                        writer.writeLine();
                    }
                    for (var _b = 0, _c = resolved.constructSignatures; _b < _c.length; _b++) {
                        var signature = _c[_b];
                        buildSignatureDisplay(signature, writer, enclosingDeclaration, globalFlagsToPass, 1 /* Construct */, symbolStack);
                        writePunctuation(writer, 23 /* SemicolonToken */);
                        writer.writeLine();
                    }
                    if (resolved.stringIndexType) {
                        // [x: string]:
                        writePunctuation(writer, 19 /* OpenBracketToken */);
                        writer.writeParameter(getIndexerParameterName(resolved, 0 /* String */, /*fallbackName*/ "x"));
                        writePunctuation(writer, 54 /* ColonToken */);
                        writeSpace(writer);
                        writeKeyword(writer, 130 /* StringKeyword */);
                        writePunctuation(writer, 20 /* CloseBracketToken */);
                        writePunctuation(writer, 54 /* ColonToken */);
                        writeSpace(writer);
                        writeType(resolved.stringIndexType, 0 /* None */);
                        writePunctuation(writer, 23 /* SemicolonToken */);
                        writer.writeLine();
                    }
                    if (resolved.numberIndexType) {
                        // [x: number]:
                        writePunctuation(writer, 19 /* OpenBracketToken */);
                        writer.writeParameter(getIndexerParameterName(resolved, 1 /* Number */, /*fallbackName*/ "x"));
                        writePunctuation(writer, 54 /* ColonToken */);
                        writeSpace(writer);
                        writeKeyword(writer, 128 /* NumberKeyword */);
                        writePunctuation(writer, 20 /* CloseBracketToken */);
                        writePunctuation(writer, 54 /* ColonToken */);
                        writeSpace(writer);
                        writeType(resolved.numberIndexType, 0 /* None */);
                        writePunctuation(writer, 23 /* SemicolonToken */);
                        writer.writeLine();
                    }
                    for (var _d = 0, _e = resolved.properties; _d < _e.length; _d++) {
                        var p = _e[_d];
                        var t = getTypeOfSymbol(p);
                        if (p.flags & (16 /* Function */ | 8192 /* Method */) && !getPropertiesOfObjectType(t).length) {
                            var signatures = getSignaturesOfType(t, 0 /* Call */);
                            for (var _f = 0, signatures_1 = signatures; _f < signatures_1.length; _f++) {
                                var signature = signatures_1[_f];
                                buildSymbolDisplay(p, writer);
                                if (p.flags & 536870912 /* Optional */) {
                                    writePunctuation(writer, 53 /* QuestionToken */);
                                }
                                buildSignatureDisplay(signature, writer, enclosingDeclaration, globalFlagsToPass, /*kind*/ undefined, symbolStack);
                                writePunctuation(writer, 23 /* SemicolonToken */);
                                writer.writeLine();
                            }
                        }
                        else {
                            buildSymbolDisplay(p, writer);
                            if (p.flags & 536870912 /* Optional */) {
                                writePunctuation(writer, 53 /* QuestionToken */);
                            }
                            writePunctuation(writer, 54 /* ColonToken */);
                            writeSpace(writer);
                            writeType(t, 0 /* None */);
                            writePunctuation(writer, 23 /* SemicolonToken */);
                            writer.writeLine();
                        }
                    }
                    writer.decreaseIndent();
                    writePunctuation(writer, 16 /* CloseBraceToken */);
                    inObjectTypeLiteral = saveInObjectTypeLiteral;
                }
            }
            function buildTypeParameterDisplayFromSymbol(symbol, writer, enclosingDeclaration, flags) {
                var targetSymbol = getTargetSymbol(symbol);
                if (targetSymbol.flags & 32 /* Class */ || targetSymbol.flags & 64 /* Interface */ || targetSymbol.flags & 524288 /* TypeAlias */) {
                    buildDisplayForTypeParametersAndDelimiters(getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol), writer, enclosingDeclaration, flags);
                }
            }
            function buildTypeParameterDisplay(tp, writer, enclosingDeclaration, flags, symbolStack) {
                appendSymbolNameOnly(tp.symbol, writer);
                var constraint = getConstraintOfTypeParameter(tp);
                if (constraint) {
                    writeSpace(writer);
                    writeKeyword(writer, 83 /* ExtendsKeyword */);
                    writeSpace(writer);
                    buildTypeDisplay(constraint, writer, enclosingDeclaration, flags, symbolStack);
                }
            }
            function buildParameterDisplay(p, writer, enclosingDeclaration, flags, symbolStack) {
                var parameterNode = p.valueDeclaration;
                if (ts.isRestParameter(parameterNode)) {
                    writePunctuation(writer, 22 /* DotDotDotToken */);
                }
                appendSymbolNameOnly(p, writer);
                if (isOptionalParameter(parameterNode)) {
                    writePunctuation(writer, 53 /* QuestionToken */);
                }
                writePunctuation(writer, 54 /* ColonToken */);
                writeSpace(writer);
                buildTypeDisplay(getTypeOfSymbol(p), writer, enclosingDeclaration, flags, symbolStack);
            }
            function buildDisplayForTypeParametersAndDelimiters(typeParameters, writer, enclosingDeclaration, flags, symbolStack) {
                if (typeParameters && typeParameters.length) {
                    writePunctuation(writer, 25 /* LessThanToken */);
                    for (var i = 0; i < typeParameters.length; i++) {
                        if (i > 0) {
                            writePunctuation(writer, 24 /* CommaToken */);
                            writeSpace(writer);
                        }
                        buildTypeParameterDisplay(typeParameters[i], writer, enclosingDeclaration, flags, symbolStack);
                    }
                    writePunctuation(writer, 27 /* GreaterThanToken */);
                }
            }
            function buildDisplayForTypeArgumentsAndDelimiters(typeParameters, mapper, writer, enclosingDeclaration, flags, symbolStack) {
                if (typeParameters && typeParameters.length) {
                    writePunctuation(writer, 25 /* LessThanToken */);
                    for (var i = 0; i < typeParameters.length; i++) {
                        if (i > 0) {
                            writePunctuation(writer, 24 /* CommaToken */);
                            writeSpace(writer);
                        }
                        buildTypeDisplay(mapper(typeParameters[i]), writer, enclosingDeclaration, 0 /* None */);
                    }
                    writePunctuation(writer, 27 /* GreaterThanToken */);
                }
            }
            function buildDisplayForParametersAndDelimiters(parameters, writer, enclosingDeclaration, flags, symbolStack) {
                writePunctuation(writer, 17 /* OpenParenToken */);
                for (var i = 0; i < parameters.length; i++) {
                    if (i > 0) {
                        writePunctuation(writer, 24 /* CommaToken */);
                        writeSpace(writer);
                    }
                    buildParameterDisplay(parameters[i], writer, enclosingDeclaration, flags, symbolStack);
                }
                writePunctuation(writer, 18 /* CloseParenToken */);
            }
            function buildTypePredicateDisplay(predicate, writer, enclosingDeclaration, flags, symbolStack) {
                if (ts.isIdentifierTypePredicate(predicate)) {
                    writer.writeParameter(predicate.parameterName);
                }
                else {
                    writeKeyword(writer, 97 /* ThisKeyword */);
                }
                writeSpace(writer);
                writeKeyword(writer, 124 /* IsKeyword */);
                writeSpace(writer);
                buildTypeDisplay(predicate.type, writer, enclosingDeclaration, flags, symbolStack);
            }
            function buildReturnTypeDisplay(signature, writer, enclosingDeclaration, flags, symbolStack) {
                if (flags & 8 /* WriteArrowStyleSignature */) {
                    writeSpace(writer);
                    writePunctuation(writer, 34 /* EqualsGreaterThanToken */);
                }
                else {
                    writePunctuation(writer, 54 /* ColonToken */);
                }
                writeSpace(writer);
                if (signature.typePredicate) {
                    buildTypePredicateDisplay(signature.typePredicate, writer, enclosingDeclaration, flags, symbolStack);
                }
                else {
                    var returnType = getReturnTypeOfSignature(signature);
                    buildTypeDisplay(returnType, writer, enclosingDeclaration, flags, symbolStack);
                }
            }
            function buildSignatureDisplay(signature, writer, enclosingDeclaration, flags, kind, symbolStack) {
                if (kind === 1 /* Construct */) {
                    writeKeyword(writer, 92 /* NewKeyword */);
                    writeSpace(writer);
                }
                if (signature.target && (flags & 32 /* WriteTypeArgumentsOfSignature */)) {
                    // Instantiated signature, write type arguments instead
                    // This is achieved by passing in the mapper separately
                    buildDisplayForTypeArgumentsAndDelimiters(signature.target.typeParameters, signature.mapper, writer, enclosingDeclaration);
                }
                else {
                    buildDisplayForTypeParametersAndDelimiters(signature.typeParameters, writer, enclosingDeclaration, flags, symbolStack);
                }
                buildDisplayForParametersAndDelimiters(signature.parameters, writer, enclosingDeclaration, flags, symbolStack);
                buildReturnTypeDisplay(signature, writer, enclosingDeclaration, flags, symbolStack);
            }
            return _displayBuilder || (_displayBuilder = {
                buildSymbolDisplay: buildSymbolDisplay,
                buildTypeDisplay: buildTypeDisplay,
                buildTypeParameterDisplay: buildTypeParameterDisplay,
                buildTypePredicateDisplay: buildTypePredicateDisplay,
                buildParameterDisplay: buildParameterDisplay,
                buildDisplayForParametersAndDelimiters: buildDisplayForParametersAndDelimiters,
                buildDisplayForTypeParametersAndDelimiters: buildDisplayForTypeParametersAndDelimiters,
                buildTypeParameterDisplayFromSymbol: buildTypeParameterDisplayFromSymbol,
                buildSignatureDisplay: buildSignatureDisplay,
                buildReturnTypeDisplay: buildReturnTypeDisplay
            });
        }
        function isDeclarationVisible(node) {
            if (node) {
                var links = getNodeLinks(node);
                if (links.isVisible === undefined) {
                    links.isVisible = !!determineIfDeclarationIsVisible();
                }
                return links.isVisible;
            }
            return false;
            function determineIfDeclarationIsVisible() {
                switch (node.kind) {
                    case 166 /* BindingElement */:
                        return isDeclarationVisible(node.parent.parent);
                    case 214 /* VariableDeclaration */:
                        if (ts.isBindingPattern(node.name) &&
                            !node.name.elements.length) {
                            // If the binding pattern is empty, this variable declaration is not visible
                            return false;
                        }
                    // Otherwise fall through
                    case 221 /* ModuleDeclaration */:
                    case 217 /* ClassDeclaration */:
                    case 218 /* InterfaceDeclaration */:
                    case 219 /* TypeAliasDeclaration */:
                    case 216 /* FunctionDeclaration */:
                    case 220 /* EnumDeclaration */:
                    case 224 /* ImportEqualsDeclaration */:
                        // external module augmentation is always visible
                        if (ts.isExternalModuleAugmentation(node)) {
                            return true;
                        }
                        var parent_2 = getDeclarationContainer(node);
                        // If the node is not exported or it is not ambient module element (except import declaration)
                        if (!(ts.getCombinedNodeFlags(node) & 2 /* Export */) &&
                            !(node.kind !== 224 /* ImportEqualsDeclaration */ && parent_2.kind !== 251 /* SourceFile */ && ts.isInAmbientContext(parent_2))) {
                            return isGlobalSourceFile(parent_2);
                        }
                        // Exported members/ambient module elements (exception import declaration) are visible if parent is visible
                        return isDeclarationVisible(parent_2);
                    case 142 /* PropertyDeclaration */:
                    case 141 /* PropertySignature */:
                    case 146 /* GetAccessor */:
                    case 147 /* SetAccessor */:
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                        if (node.flags & (16 /* Private */ | 32 /* Protected */)) {
                            // Private/protected properties/methods are not visible
                            return false;
                        }
                    // Public properties/methods are visible if its parents are visible, so const it fall into next case statement
                    case 145 /* Constructor */:
                    case 149 /* ConstructSignature */:
                    case 148 /* CallSignature */:
                    case 150 /* IndexSignature */:
                    case 139 /* Parameter */:
                    case 222 /* ModuleBlock */:
                    case 153 /* FunctionType */:
                    case 154 /* ConstructorType */:
                    case 156 /* TypeLiteral */:
                    case 152 /* TypeReference */:
                    case 157 /* ArrayType */:
                    case 158 /* TupleType */:
                    case 159 /* UnionType */:
                    case 160 /* IntersectionType */:
                    case 161 /* ParenthesizedType */:
                        return isDeclarationVisible(node.parent);
                    // Default binding, import specifier and namespace import is visible
                    // only on demand so by default it is not visible
                    case 226 /* ImportClause */:
                    case 227 /* NamespaceImport */:
                    case 229 /* ImportSpecifier */:
                        return false;
                    // Type parameters are always visible
                    case 138 /* TypeParameter */:
                    // Source file is always visible
                    case 251 /* SourceFile */:
                        return true;
                    // Export assignments do not create name bindings outside the module
                    case 230 /* ExportAssignment */:
                        return false;
                    default:
                        ts.Debug.fail("isDeclarationVisible unknown: SyntaxKind: " + node.kind);
                }
            }
        }
        function collectLinkedAliases(node) {
            var exportSymbol;
            if (node.parent && node.parent.kind === 230 /* ExportAssignment */) {
                exportSymbol = resolveName(node.parent, node.text, 107455 /* Value */ | 793056 /* Type */ | 1536 /* Namespace */ | 8388608 /* Alias */, ts.Diagnostics.Cannot_find_name_0, node);
            }
            else if (node.parent.kind === 233 /* ExportSpecifier */) {
                var exportSpecifier = node.parent;
                exportSymbol = exportSpecifier.parent.parent.moduleSpecifier ?
                    getExternalModuleMember(exportSpecifier.parent.parent, exportSpecifier) :
                    resolveEntityName(exportSpecifier.propertyName || exportSpecifier.name, 107455 /* Value */ | 793056 /* Type */ | 1536 /* Namespace */ | 8388608 /* Alias */);
            }
            var result = [];
            if (exportSymbol) {
                buildVisibleNodeList(exportSymbol.declarations);
            }
            return result;
            function buildVisibleNodeList(declarations) {
                ts.forEach(declarations, function (declaration) {
                    getNodeLinks(declaration).isVisible = true;
                    var resultNode = getAnyImportSyntax(declaration) || declaration;
                    if (!ts.contains(result, resultNode)) {
                        result.push(resultNode);
                    }
                    if (ts.isInternalModuleImportEqualsDeclaration(declaration)) {
                        // Add the referenced top container visible
                        var internalModuleReference = declaration.moduleReference;
                        var firstIdentifier = getFirstIdentifier(internalModuleReference);
                        var importSymbol = resolveName(declaration, firstIdentifier.text, 107455 /* Value */ | 793056 /* Type */ | 1536 /* Namespace */, ts.Diagnostics.Cannot_find_name_0, firstIdentifier);
                        if (importSymbol) {
                            buildVisibleNodeList(importSymbol.declarations);
                        }
                    }
                });
            }
        }
        /**
         * Push an entry on the type resolution stack. If an entry with the given target and the given property name
         * is already on the stack, and no entries in between already have a type, then a circularity has occurred.
         * In this case, the result values of the existing entry and all entries pushed after it are changed to false,
         * and the value false is returned. Otherwise, the new entry is just pushed onto the stack, and true is returned.
         * In order to see if the same query has already been done before, the target object and the propertyName both
         * must match the one passed in.
         *
         * @param target The symbol, type, or signature whose type is being queried
         * @param propertyName The property name that should be used to query the target for its type
         */
        function pushTypeResolution(target, propertyName) {
            var resolutionCycleStartIndex = findResolutionCycleStartIndex(target, propertyName);
            if (resolutionCycleStartIndex >= 0) {
                // A cycle was found
                var length_2 = resolutionTargets.length;
                for (var i = resolutionCycleStartIndex; i < length_2; i++) {
                    resolutionResults[i] = false;
                }
                return false;
            }
            resolutionTargets.push(target);
            resolutionResults.push(/*items*/ true);
            resolutionPropertyNames.push(propertyName);
            return true;
        }
        function findResolutionCycleStartIndex(target, propertyName) {
            for (var i = resolutionTargets.length - 1; i >= 0; i--) {
                if (hasType(resolutionTargets[i], resolutionPropertyNames[i])) {
                    return -1;
                }
                if (resolutionTargets[i] === target && resolutionPropertyNames[i] === propertyName) {
                    return i;
                }
            }
            return -1;
        }
        function hasType(target, propertyName) {
            if (propertyName === 0 /* Type */) {
                return getSymbolLinks(target).type;
            }
            if (propertyName === 2 /* DeclaredType */) {
                return getSymbolLinks(target).declaredType;
            }
            if (propertyName === 1 /* ResolvedBaseConstructorType */) {
                ts.Debug.assert(!!(target.flags & 1024 /* Class */));
                return target.resolvedBaseConstructorType;
            }
            if (propertyName === 3 /* ResolvedReturnType */) {
                return target.resolvedReturnType;
            }
            ts.Debug.fail("Unhandled TypeSystemPropertyName " + propertyName);
        }
        // Pop an entry from the type resolution stack and return its associated result value. The result value will
        // be true if no circularities were detected, or false if a circularity was found.
        function popTypeResolution() {
            resolutionTargets.pop();
            resolutionPropertyNames.pop();
            return resolutionResults.pop();
        }
        function getDeclarationContainer(node) {
            node = ts.getRootDeclaration(node);
            while (node) {
                switch (node.kind) {
                    case 214 /* VariableDeclaration */:
                    case 215 /* VariableDeclarationList */:
                    case 229 /* ImportSpecifier */:
                    case 228 /* NamedImports */:
                    case 227 /* NamespaceImport */:
                    case 226 /* ImportClause */:
                        node = node.parent;
                        break;
                    default:
                        return node.parent;
                }
            }
        }
        function getTypeOfPrototypeProperty(prototype) {
            // TypeScript 1.0 spec (April 2014): 8.4
            // Every class automatically contains a static property member named 'prototype',
            // the type of which is an instantiation of the class type with type Any supplied as a type argument for each type parameter.
            // It is an error to explicitly declare a static property member with the name 'prototype'.
            var classType = getDeclaredTypeOfSymbol(getParentOfSymbol(prototype));
            return classType.typeParameters ? createTypeReference(classType, ts.map(classType.typeParameters, function (_) { return anyType; })) : classType;
        }
        // Return the type of the given property in the given type, or undefined if no such property exists
        function getTypeOfPropertyOfType(type, name) {
            var prop = getPropertyOfType(type, name);
            return prop ? getTypeOfSymbol(prop) : undefined;
        }
        function isTypeAny(type) {
            return type && (type.flags & 1 /* Any */) !== 0;
        }
        // Return the type of a binding element parent. We check SymbolLinks first to see if a type has been
        // assigned by contextual typing.
        function getTypeForBindingElementParent(node) {
            var symbol = getSymbolOfNode(node);
            return symbol && getSymbolLinks(symbol).type || getTypeForVariableLikeDeclaration(node);
        }
        function getTextOfPropertyName(name) {
            switch (name.kind) {
                case 69 /* Identifier */:
                    return name.text;
                case 9 /* StringLiteral */:
                case 8 /* NumericLiteral */:
                    return name.text;
                case 137 /* ComputedPropertyName */:
                    if (ts.isStringOrNumericLiteral(name.expression.kind)) {
                        return name.expression.text;
                    }
            }
            return undefined;
        }
        function isComputedNonLiteralName(name) {
            return name.kind === 137 /* ComputedPropertyName */ && !ts.isStringOrNumericLiteral(name.expression.kind);
        }
        // Return the inferred type for a binding element
        function getTypeForBindingElement(declaration) {
            var pattern = declaration.parent;
            var parentType = getTypeForBindingElementParent(pattern.parent);
            // If parent has the unknown (error) type, then so does this binding element
            if (parentType === unknownType) {
                return unknownType;
            }
            // If no type was specified or inferred for parent, or if the specified or inferred type is any,
            // infer from the initializer of the binding element if one is present. Otherwise, go with the
            // undefined or any type of the parent.
            if (!parentType || isTypeAny(parentType)) {
                if (declaration.initializer) {
                    return checkExpressionCached(declaration.initializer);
                }
                return parentType;
            }
            var type;
            if (pattern.kind === 164 /* ObjectBindingPattern */) {
                // Use explicitly specified property name ({ p: xxx } form), or otherwise the implied name ({ p } form)
                var name_2 = declaration.propertyName || declaration.name;
                if (isComputedNonLiteralName(name_2)) {
                    // computed properties with non-literal names are treated as 'any'
                    return anyType;
                }
                // Use type of the specified property, or otherwise, for a numeric name, the type of the numeric index signature,
                // or otherwise the type of the string index signature.
                var text = getTextOfPropertyName(name_2);
                type = getTypeOfPropertyOfType(parentType, text) ||
                    isNumericLiteralName(text) && getIndexTypeOfType(parentType, 1 /* Number */) ||
                    getIndexTypeOfType(parentType, 0 /* String */);
                if (!type) {
                    error(name_2, ts.Diagnostics.Type_0_has_no_property_1_and_no_string_index_signature, typeToString(parentType), ts.declarationNameToString(name_2));
                    return unknownType;
                }
            }
            else {
                // This elementType will be used if the specific property corresponding to this index is not
                // present (aka the tuple element property). This call also checks that the parentType is in
                // fact an iterable or array (depending on target language).
                var elementType = checkIteratedTypeOrElementType(parentType, pattern, /*allowStringInput*/ false);
                if (!declaration.dotDotDotToken) {
                    // Use specific property type when parent is a tuple or numeric index type when parent is an array
                    var propName = "" + ts.indexOf(pattern.elements, declaration);
                    type = isTupleLikeType(parentType)
                        ? getTypeOfPropertyOfType(parentType, propName)
                        : elementType;
                    if (!type) {
                        if (isTupleType(parentType)) {
                            error(declaration, ts.Diagnostics.Tuple_type_0_with_length_1_cannot_be_assigned_to_tuple_with_length_2, typeToString(parentType), parentType.elementTypes.length, pattern.elements.length);
                        }
                        else {
                            error(declaration, ts.Diagnostics.Type_0_has_no_property_1, typeToString(parentType), propName);
                        }
                        return unknownType;
                    }
                }
                else {
                    // Rest element has an array type with the same element type as the parent type
                    type = createArrayType(elementType);
                }
            }
            return type;
        }
        function getTypeForVariableLikeDeclarationFromJSDocComment(declaration) {
            var jsDocType = getJSDocTypeForVariableLikeDeclarationFromJSDocComment(declaration);
            if (jsDocType) {
                return getTypeFromTypeNode(jsDocType);
            }
        }
        function getJSDocTypeForVariableLikeDeclarationFromJSDocComment(declaration) {
            // First, see if this node has an @type annotation on it directly.
            var typeTag = ts.getJSDocTypeTag(declaration);
            if (typeTag && typeTag.typeExpression) {
                return typeTag.typeExpression.type;
            }
            if (declaration.kind === 214 /* VariableDeclaration */ &&
                declaration.parent.kind === 215 /* VariableDeclarationList */ &&
                declaration.parent.parent.kind === 196 /* VariableStatement */) {
                // @type annotation might have been on the variable statement, try that instead.
                var annotation = ts.getJSDocTypeTag(declaration.parent.parent);
                if (annotation && annotation.typeExpression) {
                    return annotation.typeExpression.type;
                }
            }
            else if (declaration.kind === 139 /* Parameter */) {
                // If it's a parameter, see if the parent has a jsdoc comment with an @param
                // annotation.
                var paramTag = ts.getCorrespondingJSDocParameterTag(declaration);
                if (paramTag && paramTag.typeExpression) {
                    return paramTag.typeExpression.type;
                }
            }
            return undefined;
        }
        // Return the inferred type for a variable, parameter, or property declaration
        function getTypeForVariableLikeDeclaration(declaration) {
            if (declaration.parserContextFlags & 32 /* JavaScriptFile */) {
                // If this is a variable in a JavaScript file, then use the JSDoc type (if it has
                // one as its type), otherwise fallback to the below standard TS codepaths to
                // try to figure it out.
                var type = getTypeForVariableLikeDeclarationFromJSDocComment(declaration);
                if (type && type !== unknownType) {
                    return type;
                }
            }
            // A variable declared in a for..in statement is always of type string
            if (declaration.parent.parent.kind === 203 /* ForInStatement */) {
                return stringType;
            }
            if (declaration.parent.parent.kind === 204 /* ForOfStatement */) {
                // checkRightHandSideOfForOf will return undefined if the for-of expression type was
                // missing properties/signatures required to get its iteratedType (like
                // [Symbol.iterator] or next). This may be because we accessed properties from anyType,
                // or it may have led to an error inside getElementTypeOfIterable.
                return checkRightHandSideOfForOf(declaration.parent.parent.expression) || anyType;
            }
            if (ts.isBindingPattern(declaration.parent)) {
                return getTypeForBindingElement(declaration);
            }
            // Use type from type annotation if one is present
            if (declaration.type) {
                return getTypeFromTypeNode(declaration.type);
            }
            if (declaration.kind === 139 /* Parameter */) {
                var func = declaration.parent;
                // For a parameter of a set accessor, use the type of the get accessor if one is present
                if (func.kind === 147 /* SetAccessor */ && !ts.hasDynamicName(func)) {
                    var getter = ts.getDeclarationOfKind(declaration.parent.symbol, 146 /* GetAccessor */);
                    if (getter) {
                        return getReturnTypeOfSignature(getSignatureFromDeclaration(getter));
                    }
                }
                // Use contextual parameter type if one is available
                var type = getContextuallyTypedParameterType(declaration);
                if (type) {
                    return type;
                }
            }
            // Use the type of the initializer expression if one is present
            if (declaration.initializer) {
                return checkExpressionCached(declaration.initializer);
            }
            // If it is a short-hand property assignment, use the type of the identifier
            if (declaration.kind === 249 /* ShorthandPropertyAssignment */) {
                return checkIdentifier(declaration.name);
            }
            // If the declaration specifies a binding pattern, use the type implied by the binding pattern
            if (ts.isBindingPattern(declaration.name)) {
                return getTypeFromBindingPattern(declaration.name, /*includePatternInType*/ false);
            }
            // No type specified and nothing can be inferred
            return undefined;
        }
        // Return the type implied by a binding pattern element. This is the type of the initializer of the element if
        // one is present. Otherwise, if the element is itself a binding pattern, it is the type implied by the binding
        // pattern. Otherwise, it is the type any.
        function getTypeFromBindingElement(element, includePatternInType) {
            if (element.initializer) {
                return getWidenedType(checkExpressionCached(element.initializer));
            }
            if (ts.isBindingPattern(element.name)) {
                return getTypeFromBindingPattern(element.name, includePatternInType);
            }
            return anyType;
        }
        // Return the type implied by an object binding pattern
        function getTypeFromObjectBindingPattern(pattern, includePatternInType) {
            var members = {};
            var hasComputedProperties = false;
            ts.forEach(pattern.elements, function (e) {
                var name = e.propertyName || e.name;
                if (isComputedNonLiteralName(name)) {
                    // do not include computed properties in the implied type
                    hasComputedProperties = true;
                    return;
                }
                var text = getTextOfPropertyName(name);
                var flags = 4 /* Property */ | 67108864 /* Transient */ | (e.initializer ? 536870912 /* Optional */ : 0);
                var symbol = createSymbol(flags, text);
                symbol.type = getTypeFromBindingElement(e, includePatternInType);
                symbol.bindingElement = e;
                members[symbol.name] = symbol;
            });
            var result = createAnonymousType(undefined, members, emptyArray, emptyArray, undefined, undefined);
            if (includePatternInType) {
                result.pattern = pattern;
            }
            if (hasComputedProperties) {
                result.flags |= 67108864 /* ObjectLiteralPatternWithComputedProperties */;
            }
            return result;
        }
        // Return the type implied by an array binding pattern
        function getTypeFromArrayBindingPattern(pattern, includePatternInType) {
            var elements = pattern.elements;
            if (elements.length === 0 || elements[elements.length - 1].dotDotDotToken) {
                return languageVersion >= 2 /* ES6 */ ? createIterableType(anyType) : anyArrayType;
            }
            // If the pattern has at least one element, and no rest element, then it should imply a tuple type.
            var elementTypes = ts.map(elements, function (e) { return e.kind === 190 /* OmittedExpression */ ? anyType : getTypeFromBindingElement(e, includePatternInType); });
            if (includePatternInType) {
                var result = createNewTupleType(elementTypes);
                result.pattern = pattern;
                return result;
            }
            return createTupleType(elementTypes);
        }
        // Return the type implied by a binding pattern. This is the type implied purely by the binding pattern itself
        // and without regard to its context (i.e. without regard any type annotation or initializer associated with the
        // declaration in which the binding pattern is contained). For example, the implied type of [x, y] is [any, any]
        // and the implied type of { x, y: z = 1 } is { x: any; y: number; }. The type implied by a binding pattern is
        // used as the contextual type of an initializer associated with the binding pattern. Also, for a destructuring
        // parameter with no type annotation or initializer, the type implied by the binding pattern becomes the type of
        // the parameter.
        function getTypeFromBindingPattern(pattern, includePatternInType) {
            return pattern.kind === 164 /* ObjectBindingPattern */
                ? getTypeFromObjectBindingPattern(pattern, includePatternInType)
                : getTypeFromArrayBindingPattern(pattern, includePatternInType);
        }
        // Return the type associated with a variable, parameter, or property declaration. In the simple case this is the type
        // specified in a type annotation or inferred from an initializer. However, in the case of a destructuring declaration it
        // is a bit more involved. For example:
        //
        //   var [x, s = ""] = [1, "one"];
        //
        // Here, the array literal [1, "one"] is contextually typed by the type [any, string], which is the implied type of the
        // binding pattern [x, s = ""]. Because the contextual type is a tuple type, the resulting type of [1, "one"] is the
        // tuple type [number, string]. Thus, the type inferred for 'x' is number and the type inferred for 's' is string.
        function getWidenedTypeForVariableLikeDeclaration(declaration, reportErrors) {
            var type = getTypeForVariableLikeDeclaration(declaration);
            if (type) {
                if (reportErrors) {
                    reportErrorsFromWidening(declaration, type);
                }
                // During a normal type check we'll never get to here with a property assignment (the check of the containing
                // object literal uses a different path). We exclude widening only so that language services and type verification
                // tools see the actual type.
                if (declaration.kind === 248 /* PropertyAssignment */) {
                    return type;
                }
                return getWidenedType(type);
            }
            // Rest parameters default to type any[], other parameters default to type any
            type = declaration.dotDotDotToken ? anyArrayType : anyType;
            // Report implicit any errors unless this is a private property within an ambient declaration
            if (reportErrors && compilerOptions.noImplicitAny) {
                var root = ts.getRootDeclaration(declaration);
                if (!isPrivateWithinAmbient(root) && !(root.kind === 139 /* Parameter */ && isPrivateWithinAmbient(root.parent))) {
                    reportImplicitAnyError(declaration, type);
                }
            }
            return type;
        }
        function getTypeOfVariableOrParameterOrProperty(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.type) {
                // Handle prototype property
                if (symbol.flags & 134217728 /* Prototype */) {
                    return links.type = getTypeOfPrototypeProperty(symbol);
                }
                // Handle catch clause variables
                var declaration = symbol.valueDeclaration;
                if (declaration.parent.kind === 247 /* CatchClause */) {
                    return links.type = anyType;
                }
                // Handle export default expressions
                if (declaration.kind === 230 /* ExportAssignment */) {
                    return links.type = checkExpression(declaration.expression);
                }
                // Handle module.exports = expr
                if (declaration.kind === 184 /* BinaryExpression */) {
                    return links.type = getUnionType(ts.map(symbol.declarations, function (decl) { return checkExpressionCached(decl.right); }));
                }
                if (declaration.kind === 169 /* PropertyAccessExpression */) {
                    // Declarations only exist for property access expressions for certain
                    // special assignment kinds
                    if (declaration.parent.kind === 184 /* BinaryExpression */) {
                        // Handle exports.p = expr or this.p = expr or className.prototype.method = expr
                        return links.type = checkExpressionCached(declaration.parent.right);
                    }
                }
                // Handle variable, parameter or property
                if (!pushTypeResolution(symbol, 0 /* Type */)) {
                    return unknownType;
                }
                var type = getWidenedTypeForVariableLikeDeclaration(declaration, /*reportErrors*/ true);
                if (!popTypeResolution()) {
                    if (symbol.valueDeclaration.type) {
                        // Variable has type annotation that circularly references the variable itself
                        type = unknownType;
                        error(symbol.valueDeclaration, ts.Diagnostics._0_is_referenced_directly_or_indirectly_in_its_own_type_annotation, symbolToString(symbol));
                    }
                    else {
                        // Variable has initializer that circularly references the variable itself
                        type = anyType;
                        if (compilerOptions.noImplicitAny) {
                            error(symbol.valueDeclaration, ts.Diagnostics._0_implicitly_has_type_any_because_it_does_not_have_a_type_annotation_and_is_referenced_directly_or_indirectly_in_its_own_initializer, symbolToString(symbol));
                        }
                    }
                }
                links.type = type;
            }
            return links.type;
        }
        function getAnnotatedAccessorType(accessor) {
            if (accessor) {
                if (accessor.kind === 146 /* GetAccessor */) {
                    return accessor.type && getTypeFromTypeNode(accessor.type);
                }
                else {
                    var setterTypeAnnotation = ts.getSetAccessorTypeAnnotationNode(accessor);
                    return setterTypeAnnotation && getTypeFromTypeNode(setterTypeAnnotation);
                }
            }
            return undefined;
        }
        function getTypeOfAccessors(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.type) {
                if (!pushTypeResolution(symbol, 0 /* Type */)) {
                    return unknownType;
                }
                var getter = ts.getDeclarationOfKind(symbol, 146 /* GetAccessor */);
                var setter = ts.getDeclarationOfKind(symbol, 147 /* SetAccessor */);
                var type = void 0;
                // First try to see if the user specified a return type on the get-accessor.
                var getterReturnType = getAnnotatedAccessorType(getter);
                if (getterReturnType) {
                    type = getterReturnType;
                }
                else {
                    // If the user didn't specify a return type, try to use the set-accessor's parameter type.
                    var setterParameterType = getAnnotatedAccessorType(setter);
                    if (setterParameterType) {
                        type = setterParameterType;
                    }
                    else {
                        // If there are no specified types, try to infer it from the body of the get accessor if it exists.
                        if (getter && getter.body) {
                            type = getReturnTypeFromBody(getter);
                        }
                        else {
                            if (compilerOptions.noImplicitAny) {
                                error(setter, ts.Diagnostics.Property_0_implicitly_has_type_any_because_its_set_accessor_lacks_a_type_annotation, symbolToString(symbol));
                            }
                            type = anyType;
                        }
                    }
                }
                if (!popTypeResolution()) {
                    type = anyType;
                    if (compilerOptions.noImplicitAny) {
                        var getter_1 = ts.getDeclarationOfKind(symbol, 146 /* GetAccessor */);
                        error(getter_1, ts.Diagnostics._0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions, symbolToString(symbol));
                    }
                }
                links.type = type;
            }
            return links.type;
        }
        function getTypeOfFuncClassEnumModule(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.type) {
                links.type = createObjectType(65536 /* Anonymous */, symbol);
            }
            return links.type;
        }
        function getTypeOfEnumMember(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.type) {
                links.type = getDeclaredTypeOfEnum(getParentOfSymbol(symbol));
            }
            return links.type;
        }
        function getTypeOfAlias(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.type) {
                var targetSymbol = resolveAlias(symbol);
                // It only makes sense to get the type of a value symbol. If the result of resolving
                // the alias is not a value, then it has no type. To get the type associated with a
                // type symbol, call getDeclaredTypeOfSymbol.
                // This check is important because without it, a call to getTypeOfSymbol could end
                // up recursively calling getTypeOfAlias, causing a stack overflow.
                links.type = targetSymbol.flags & 107455 /* Value */
                    ? getTypeOfSymbol(targetSymbol)
                    : unknownType;
            }
            return links.type;
        }
        function getTypeOfInstantiatedSymbol(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.type) {
                links.type = instantiateType(getTypeOfSymbol(links.target), links.mapper);
            }
            return links.type;
        }
        function getTypeOfSymbol(symbol) {
            if (symbol.flags & 16777216 /* Instantiated */) {
                return getTypeOfInstantiatedSymbol(symbol);
            }
            if (symbol.flags & (3 /* Variable */ | 4 /* Property */)) {
                return getTypeOfVariableOrParameterOrProperty(symbol);
            }
            if (symbol.flags & (16 /* Function */ | 8192 /* Method */ | 32 /* Class */ | 384 /* Enum */ | 512 /* ValueModule */)) {
                return getTypeOfFuncClassEnumModule(symbol);
            }
            if (symbol.flags & 8 /* EnumMember */) {
                return getTypeOfEnumMember(symbol);
            }
            if (symbol.flags & 98304 /* Accessor */) {
                return getTypeOfAccessors(symbol);
            }
            if (symbol.flags & 8388608 /* Alias */) {
                return getTypeOfAlias(symbol);
            }
            return unknownType;
        }
        function getTargetType(type) {
            return type.flags & 4096 /* Reference */ ? type.target : type;
        }
        function hasBaseType(type, checkBase) {
            return check(type);
            function check(type) {
                var target = getTargetType(type);
                return target === checkBase || ts.forEach(getBaseTypes(target), check);
            }
        }
        // Appends the type parameters given by a list of declarations to a set of type parameters and returns the resulting set.
        // The function allocates a new array if the input type parameter set is undefined, but otherwise it modifies the set
        // in-place and returns the same array.
        function appendTypeParameters(typeParameters, declarations) {
            for (var _i = 0, declarations_1 = declarations; _i < declarations_1.length; _i++) {
                var declaration = declarations_1[_i];
                var tp = getDeclaredTypeOfTypeParameter(getSymbolOfNode(declaration));
                if (!typeParameters) {
                    typeParameters = [tp];
                }
                else if (!ts.contains(typeParameters, tp)) {
                    typeParameters.push(tp);
                }
            }
            return typeParameters;
        }
        // Appends the outer type parameters of a node to a set of type parameters and returns the resulting set. The function
        // allocates a new array if the input type parameter set is undefined, but otherwise it modifies the set in-place and
        // returns the same array.
        function appendOuterTypeParameters(typeParameters, node) {
            while (true) {
                node = node.parent;
                if (!node) {
                    return typeParameters;
                }
                if (node.kind === 217 /* ClassDeclaration */ || node.kind === 189 /* ClassExpression */ ||
                    node.kind === 216 /* FunctionDeclaration */ || node.kind === 176 /* FunctionExpression */ ||
                    node.kind === 144 /* MethodDeclaration */ || node.kind === 177 /* ArrowFunction */) {
                    var declarations = node.typeParameters;
                    if (declarations) {
                        return appendTypeParameters(appendOuterTypeParameters(typeParameters, node), declarations);
                    }
                }
            }
        }
        // The outer type parameters are those defined by enclosing generic classes, methods, or functions.
        function getOuterTypeParametersOfClassOrInterface(symbol) {
            var declaration = symbol.flags & 32 /* Class */ ? symbol.valueDeclaration : ts.getDeclarationOfKind(symbol, 218 /* InterfaceDeclaration */);
            return appendOuterTypeParameters(undefined, declaration);
        }
        // The local type parameters are the combined set of type parameters from all declarations of the class,
        // interface, or type alias.
        function getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol) {
            var result;
            for (var _i = 0, _a = symbol.declarations; _i < _a.length; _i++) {
                var node = _a[_i];
                if (node.kind === 218 /* InterfaceDeclaration */ || node.kind === 217 /* ClassDeclaration */ ||
                    node.kind === 189 /* ClassExpression */ || node.kind === 219 /* TypeAliasDeclaration */) {
                    var declaration = node;
                    if (declaration.typeParameters) {
                        result = appendTypeParameters(result, declaration.typeParameters);
                    }
                }
            }
            return result;
        }
        // The full set of type parameters for a generic class or interface type consists of its outer type parameters plus
        // its locally declared type parameters.
        function getTypeParametersOfClassOrInterface(symbol) {
            return ts.concatenate(getOuterTypeParametersOfClassOrInterface(symbol), getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol));
        }
        function isConstructorType(type) {
            return type.flags & 80896 /* ObjectType */ && getSignaturesOfType(type, 1 /* Construct */).length > 0;
        }
        function getBaseTypeNodeOfClass(type) {
            return ts.getClassExtendsHeritageClauseElement(type.symbol.valueDeclaration);
        }
        function getConstructorsForTypeArguments(type, typeArgumentNodes) {
            var typeArgCount = typeArgumentNodes ? typeArgumentNodes.length : 0;
            return ts.filter(getSignaturesOfType(type, 1 /* Construct */), function (sig) { return (sig.typeParameters ? sig.typeParameters.length : 0) === typeArgCount; });
        }
        function getInstantiatedConstructorsForTypeArguments(type, typeArgumentNodes) {
            var signatures = getConstructorsForTypeArguments(type, typeArgumentNodes);
            if (typeArgumentNodes) {
                var typeArguments_1 = ts.map(typeArgumentNodes, getTypeFromTypeNode);
                signatures = ts.map(signatures, function (sig) { return getSignatureInstantiation(sig, typeArguments_1); });
            }
            return signatures;
        }
        // The base constructor of a class can resolve to
        // undefinedType if the class has no extends clause,
        // unknownType if an error occurred during resolution of the extends expression,
        // nullType if the extends expression is the null value, or
        // an object type with at least one construct signature.
        function getBaseConstructorTypeOfClass(type) {
            if (!type.resolvedBaseConstructorType) {
                var baseTypeNode = getBaseTypeNodeOfClass(type);
                if (!baseTypeNode) {
                    return type.resolvedBaseConstructorType = undefinedType;
                }
                if (!pushTypeResolution(type, 1 /* ResolvedBaseConstructorType */)) {
                    return unknownType;
                }
                var baseConstructorType = checkExpression(baseTypeNode.expression);
                if (baseConstructorType.flags & 80896 /* ObjectType */) {
                    // Resolving the members of a class requires us to resolve the base class of that class.
                    // We force resolution here such that we catch circularities now.
                    resolveStructuredTypeMembers(baseConstructorType);
                }
                if (!popTypeResolution()) {
                    error(type.symbol.valueDeclaration, ts.Diagnostics._0_is_referenced_directly_or_indirectly_in_its_own_base_expression, symbolToString(type.symbol));
                    return type.resolvedBaseConstructorType = unknownType;
                }
                if (baseConstructorType !== unknownType && baseConstructorType !== nullType && !isConstructorType(baseConstructorType)) {
                    error(baseTypeNode.expression, ts.Diagnostics.Type_0_is_not_a_constructor_function_type, typeToString(baseConstructorType));
                    return type.resolvedBaseConstructorType = unknownType;
                }
                type.resolvedBaseConstructorType = baseConstructorType;
            }
            return type.resolvedBaseConstructorType;
        }
        function getBaseTypes(type) {
            var isClass = type.symbol.flags & 32 /* Class */;
            var isInterface = type.symbol.flags & 64 /* Interface */;
            if (!type.resolvedBaseTypes) {
                if (!isClass && !isInterface) {
                    ts.Debug.fail("type must be class or interface");
                }
                if (isClass) {
                    resolveBaseTypesOfClass(type);
                }
                if (isInterface) {
                    resolveBaseTypesOfInterface(type);
                }
            }
            return type.resolvedBaseTypes;
        }
        function resolveBaseTypesOfClass(type) {
            type.resolvedBaseTypes = type.resolvedBaseTypes || emptyArray;
            var baseConstructorType = getBaseConstructorTypeOfClass(type);
            if (!(baseConstructorType.flags & 80896 /* ObjectType */)) {
                return;
            }
            var baseTypeNode = getBaseTypeNodeOfClass(type);
            var baseType;
            var originalBaseType = baseConstructorType && baseConstructorType.symbol ? getDeclaredTypeOfSymbol(baseConstructorType.symbol) : undefined;
            if (baseConstructorType.symbol && baseConstructorType.symbol.flags & 32 /* Class */ &&
                areAllOuterTypeParametersApplied(originalBaseType)) {
                // When base constructor type is a class with no captured type arguments we know that the constructors all have the same type parameters as the
                // class and all return the instance type of the class. There is no need for further checks and we can apply the
                // type arguments in the same manner as a type reference to get the same error reporting experience.
                baseType = getTypeFromClassOrInterfaceReference(baseTypeNode, baseConstructorType.symbol);
            }
            else {
                // The class derives from a "class-like" constructor function, check that we have at least one construct signature
                // with a matching number of type parameters and use the return type of the first instantiated signature. Elsewhere
                // we check that all instantiated signatures return the same type.
                var constructors = getInstantiatedConstructorsForTypeArguments(baseConstructorType, baseTypeNode.typeArguments);
                if (!constructors.length) {
                    error(baseTypeNode.expression, ts.Diagnostics.No_base_constructor_has_the_specified_number_of_type_arguments);
                    return;
                }
                baseType = getReturnTypeOfSignature(constructors[0]);
            }
            if (baseType === unknownType) {
                return;
            }
            if (!(getTargetType(baseType).flags & (1024 /* Class */ | 2048 /* Interface */))) {
                error(baseTypeNode.expression, ts.Diagnostics.Base_constructor_return_type_0_is_not_a_class_or_interface_type, typeToString(baseType));
                return;
            }
            if (type === baseType || hasBaseType(baseType, type)) {
                error(type.symbol.valueDeclaration, ts.Diagnostics.Type_0_recursively_references_itself_as_a_base_type, typeToString(type, /*enclosingDeclaration*/ undefined, 1 /* WriteArrayAsGenericType */));
                return;
            }
            if (type.resolvedBaseTypes === emptyArray) {
                type.resolvedBaseTypes = [baseType];
            }
            else {
                type.resolvedBaseTypes.push(baseType);
            }
        }
        function areAllOuterTypeParametersApplied(type) {
            // An unapplied type parameter has its symbol still the same as the matching argument symbol.
            // Since parameters are applied outer-to-inner, only the last outer parameter needs to be checked.
            var outerTypeParameters = type.outerTypeParameters;
            if (outerTypeParameters) {
                var last = outerTypeParameters.length - 1;
                var typeArguments = type.typeArguments;
                return outerTypeParameters[last].symbol !== typeArguments[last].symbol;
            }
            return true;
        }
        function resolveBaseTypesOfInterface(type) {
            type.resolvedBaseTypes = type.resolvedBaseTypes || emptyArray;
            for (var _i = 0, _a = type.symbol.declarations; _i < _a.length; _i++) {
                var declaration = _a[_i];
                if (declaration.kind === 218 /* InterfaceDeclaration */ && ts.getInterfaceBaseTypeNodes(declaration)) {
                    for (var _b = 0, _c = ts.getInterfaceBaseTypeNodes(declaration); _b < _c.length; _b++) {
                        var node = _c[_b];
                        var baseType = getTypeFromTypeNode(node);
                        if (baseType !== unknownType) {
                            if (getTargetType(baseType).flags & (1024 /* Class */ | 2048 /* Interface */)) {
                                if (type !== baseType && !hasBaseType(baseType, type)) {
                                    if (type.resolvedBaseTypes === emptyArray) {
                                        type.resolvedBaseTypes = [baseType];
                                    }
                                    else {
                                        type.resolvedBaseTypes.push(baseType);
                                    }
                                }
                                else {
                                    error(declaration, ts.Diagnostics.Type_0_recursively_references_itself_as_a_base_type, typeToString(type, /*enclosingDeclaration*/ undefined, 1 /* WriteArrayAsGenericType */));
                                }
                            }
                            else {
                                error(node, ts.Diagnostics.An_interface_may_only_extend_a_class_or_another_interface);
                            }
                        }
                    }
                }
            }
        }
        // Returns true if the interface given by the symbol is free of "this" references. Specifically, the result is
        // true if the interface itself contains no references to "this" in its body, if all base types are interfaces,
        // and if none of the base interfaces have a "this" type.
        function isIndependentInterface(symbol) {
            for (var _i = 0, _a = symbol.declarations; _i < _a.length; _i++) {
                var declaration = _a[_i];
                if (declaration.kind === 218 /* InterfaceDeclaration */) {
                    if (declaration.flags & 262144 /* ContainsThis */) {
                        return false;
                    }
                    var baseTypeNodes = ts.getInterfaceBaseTypeNodes(declaration);
                    if (baseTypeNodes) {
                        for (var _b = 0, baseTypeNodes_1 = baseTypeNodes; _b < baseTypeNodes_1.length; _b++) {
                            var node = baseTypeNodes_1[_b];
                            if (ts.isSupportedExpressionWithTypeArguments(node)) {
                                var baseSymbol = resolveEntityName(node.expression, 793056 /* Type */, /*ignoreErrors*/ true);
                                if (!baseSymbol || !(baseSymbol.flags & 64 /* Interface */) || getDeclaredTypeOfClassOrInterface(baseSymbol).thisType) {
                                    return false;
                                }
                            }
                        }
                    }
                }
            }
            return true;
        }
        function getDeclaredTypeOfClassOrInterface(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.declaredType) {
                var kind = symbol.flags & 32 /* Class */ ? 1024 /* Class */ : 2048 /* Interface */;
                var type = links.declaredType = createObjectType(kind, symbol);
                var outerTypeParameters = getOuterTypeParametersOfClassOrInterface(symbol);
                var localTypeParameters = getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol);
                // A class or interface is generic if it has type parameters or a "this" type. We always give classes a "this" type
                // because it is not feasible to analyze all members to determine if the "this" type escapes the class (in particular,
                // property types inferred from initializers and method return types inferred from return statements are very hard
                // to exhaustively analyze). We give interfaces a "this" type if we can't definitely determine that they are free of
                // "this" references.
                if (outerTypeParameters || localTypeParameters || kind === 1024 /* Class */ || !isIndependentInterface(symbol)) {
                    type.flags |= 4096 /* Reference */;
                    type.typeParameters = ts.concatenate(outerTypeParameters, localTypeParameters);
                    type.outerTypeParameters = outerTypeParameters;
                    type.localTypeParameters = localTypeParameters;
                    type.instantiations = {};
                    type.instantiations[getTypeListId(type.typeParameters)] = type;
                    type.target = type;
                    type.typeArguments = type.typeParameters;
                    type.thisType = createType(512 /* TypeParameter */ | 33554432 /* ThisType */);
                    type.thisType.symbol = symbol;
                    type.thisType.constraint = type;
                }
            }
            return links.declaredType;
        }
        function getDeclaredTypeOfTypeAlias(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.declaredType) {
                // Note that we use the links object as the target here because the symbol object is used as the unique
                // identity for resolution of the 'type' property in SymbolLinks.
                if (!pushTypeResolution(symbol, 2 /* DeclaredType */)) {
                    return unknownType;
                }
                var declaration = ts.getDeclarationOfKind(symbol, 219 /* TypeAliasDeclaration */);
                var type = getTypeFromTypeNode(declaration.type);
                if (popTypeResolution()) {
                    links.typeParameters = getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(symbol);
                    if (links.typeParameters) {
                        // Initialize the instantiation cache for generic type aliases. The declared type corresponds to
                        // an instantiation of the type alias with the type parameters supplied as type arguments.
                        links.instantiations = {};
                        links.instantiations[getTypeListId(links.typeParameters)] = type;
                    }
                }
                else {
                    type = unknownType;
                    error(declaration.name, ts.Diagnostics.Type_alias_0_circularly_references_itself, symbolToString(symbol));
                }
                links.declaredType = type;
            }
            return links.declaredType;
        }
        function getDeclaredTypeOfEnum(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.declaredType) {
                var type = createType(128 /* Enum */);
                type.symbol = symbol;
                links.declaredType = type;
            }
            return links.declaredType;
        }
        function getDeclaredTypeOfTypeParameter(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.declaredType) {
                var type = createType(512 /* TypeParameter */);
                type.symbol = symbol;
                if (!ts.getDeclarationOfKind(symbol, 138 /* TypeParameter */).constraint) {
                    type.constraint = noConstraintType;
                }
                links.declaredType = type;
            }
            return links.declaredType;
        }
        function getDeclaredTypeOfAlias(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.declaredType) {
                links.declaredType = getDeclaredTypeOfSymbol(resolveAlias(symbol));
            }
            return links.declaredType;
        }
        function getDeclaredTypeOfSymbol(symbol) {
            ts.Debug.assert((symbol.flags & 16777216 /* Instantiated */) === 0);
            if (symbol.flags & (32 /* Class */ | 64 /* Interface */)) {
                return getDeclaredTypeOfClassOrInterface(symbol);
            }
            if (symbol.flags & 524288 /* TypeAlias */) {
                return getDeclaredTypeOfTypeAlias(symbol);
            }
            if (symbol.flags & 384 /* Enum */) {
                return getDeclaredTypeOfEnum(symbol);
            }
            if (symbol.flags & 262144 /* TypeParameter */) {
                return getDeclaredTypeOfTypeParameter(symbol);
            }
            if (symbol.flags & 8388608 /* Alias */) {
                return getDeclaredTypeOfAlias(symbol);
            }
            return unknownType;
        }
        // A type reference is considered independent if each type argument is considered independent.
        function isIndependentTypeReference(node) {
            if (node.typeArguments) {
                for (var _i = 0, _a = node.typeArguments; _i < _a.length; _i++) {
                    var typeNode = _a[_i];
                    if (!isIndependentType(typeNode)) {
                        return false;
                    }
                }
            }
            return true;
        }
        // A type is considered independent if it the any, string, number, boolean, symbol, or void keyword, a string
        // literal type, an array with an element type that is considered independent, or a type reference that is
        // considered independent.
        function isIndependentType(node) {
            switch (node.kind) {
                case 117 /* AnyKeyword */:
                case 130 /* StringKeyword */:
                case 128 /* NumberKeyword */:
                case 120 /* BooleanKeyword */:
                case 131 /* SymbolKeyword */:
                case 103 /* VoidKeyword */:
                case 163 /* StringLiteralType */:
                    return true;
                case 157 /* ArrayType */:
                    return isIndependentType(node.elementType);
                case 152 /* TypeReference */:
                    return isIndependentTypeReference(node);
            }
            return false;
        }
        // A variable-like declaration is considered independent (free of this references) if it has a type annotation
        // that specifies an independent type, or if it has no type annotation and no initializer (and thus of type any).
        function isIndependentVariableLikeDeclaration(node) {
            return node.type && isIndependentType(node.type) || !node.type && !node.initializer;
        }
        // A function-like declaration is considered independent (free of this references) if it has a return type
        // annotation that is considered independent and if each parameter is considered independent.
        function isIndependentFunctionLikeDeclaration(node) {
            if (node.kind !== 145 /* Constructor */ && (!node.type || !isIndependentType(node.type))) {
                return false;
            }
            for (var _i = 0, _a = node.parameters; _i < _a.length; _i++) {
                var parameter = _a[_i];
                if (!isIndependentVariableLikeDeclaration(parameter)) {
                    return false;
                }
            }
            return true;
        }
        // Returns true if the class or interface member given by the symbol is free of "this" references. The
        // function may return false for symbols that are actually free of "this" references because it is not
        // feasible to perform a complete analysis in all cases. In particular, property members with types
        // inferred from their initializers and function members with inferred return types are convervatively
        // assumed not to be free of "this" references.
        function isIndependentMember(symbol) {
            if (symbol.declarations && symbol.declarations.length === 1) {
                var declaration = symbol.declarations[0];
                if (declaration) {
                    switch (declaration.kind) {
                        case 142 /* PropertyDeclaration */:
                        case 141 /* PropertySignature */:
                            return isIndependentVariableLikeDeclaration(declaration);
                        case 144 /* MethodDeclaration */:
                        case 143 /* MethodSignature */:
                        case 145 /* Constructor */:
                            return isIndependentFunctionLikeDeclaration(declaration);
                    }
                }
            }
            return false;
        }
        function createSymbolTable(symbols) {
            var result = {};
            for (var _i = 0, symbols_1 = symbols; _i < symbols_1.length; _i++) {
                var symbol = symbols_1[_i];
                result[symbol.name] = symbol;
            }
            return result;
        }
        // The mappingThisOnly flag indicates that the only type parameter being mapped is "this". When the flag is true,
        // we check symbols to see if we can quickly conclude they are free of "this" references, thus needing no instantiation.
        function createInstantiatedSymbolTable(symbols, mapper, mappingThisOnly) {
            var result = {};
            for (var _i = 0, symbols_2 = symbols; _i < symbols_2.length; _i++) {
                var symbol = symbols_2[_i];
                result[symbol.name] = mappingThisOnly && isIndependentMember(symbol) ? symbol : instantiateSymbol(symbol, mapper);
            }
            return result;
        }
        function addInheritedMembers(symbols, baseSymbols) {
            for (var _i = 0, baseSymbols_1 = baseSymbols; _i < baseSymbols_1.length; _i++) {
                var s = baseSymbols_1[_i];
                if (!ts.hasProperty(symbols, s.name)) {
                    symbols[s.name] = s;
                }
            }
        }
        function resolveDeclaredMembers(type) {
            if (!type.declaredProperties) {
                var symbol = type.symbol;
                type.declaredProperties = getNamedMembers(symbol.members);
                type.declaredCallSignatures = getSignaturesOfSymbol(symbol.members["__call"]);
                type.declaredConstructSignatures = getSignaturesOfSymbol(symbol.members["__new"]);
                type.declaredStringIndexType = getIndexTypeOfSymbol(symbol, 0 /* String */);
                type.declaredNumberIndexType = getIndexTypeOfSymbol(symbol, 1 /* Number */);
            }
            return type;
        }
        function getTypeWithThisArgument(type, thisArgument) {
            if (type.flags & 4096 /* Reference */) {
                return createTypeReference(type.target, ts.concatenate(type.typeArguments, [thisArgument || type.target.thisType]));
            }
            return type;
        }
        function resolveObjectTypeMembers(type, source, typeParameters, typeArguments) {
            var mapper = identityMapper;
            var members = source.symbol.members;
            var callSignatures = source.declaredCallSignatures;
            var constructSignatures = source.declaredConstructSignatures;
            var stringIndexType = source.declaredStringIndexType;
            var numberIndexType = source.declaredNumberIndexType;
            if (!ts.rangeEquals(typeParameters, typeArguments, 0, typeParameters.length)) {
                mapper = createTypeMapper(typeParameters, typeArguments);
                members = createInstantiatedSymbolTable(source.declaredProperties, mapper, /*mappingThisOnly*/ typeParameters.length === 1);
                callSignatures = instantiateList(source.declaredCallSignatures, mapper, instantiateSignature);
                constructSignatures = instantiateList(source.declaredConstructSignatures, mapper, instantiateSignature);
                stringIndexType = instantiateType(source.declaredStringIndexType, mapper);
                numberIndexType = instantiateType(source.declaredNumberIndexType, mapper);
            }
            var baseTypes = getBaseTypes(source);
            if (baseTypes.length) {
                if (members === source.symbol.members) {
                    members = createSymbolTable(source.declaredProperties);
                }
                var thisArgument = ts.lastOrUndefined(typeArguments);
                for (var _i = 0, baseTypes_1 = baseTypes; _i < baseTypes_1.length; _i++) {
                    var baseType = baseTypes_1[_i];
                    var instantiatedBaseType = thisArgument ? getTypeWithThisArgument(instantiateType(baseType, mapper), thisArgument) : baseType;
                    addInheritedMembers(members, getPropertiesOfObjectType(instantiatedBaseType));
                    callSignatures = ts.concatenate(callSignatures, getSignaturesOfType(instantiatedBaseType, 0 /* Call */));
                    constructSignatures = ts.concatenate(constructSignatures, getSignaturesOfType(instantiatedBaseType, 1 /* Construct */));
                    stringIndexType = stringIndexType || getIndexTypeOfType(instantiatedBaseType, 0 /* String */);
                    numberIndexType = numberIndexType || getIndexTypeOfType(instantiatedBaseType, 1 /* Number */);
                }
            }
            setObjectTypeMembers(type, members, callSignatures, constructSignatures, stringIndexType, numberIndexType);
        }
        function resolveClassOrInterfaceMembers(type) {
            resolveObjectTypeMembers(type, resolveDeclaredMembers(type), emptyArray, emptyArray);
        }
        function resolveTypeReferenceMembers(type) {
            var source = resolveDeclaredMembers(type.target);
            var typeParameters = ts.concatenate(source.typeParameters, [source.thisType]);
            var typeArguments = type.typeArguments && type.typeArguments.length === typeParameters.length ?
                type.typeArguments : ts.concatenate(type.typeArguments, [type]);
            resolveObjectTypeMembers(type, source, typeParameters, typeArguments);
        }
        function createSignature(declaration, typeParameters, parameters, resolvedReturnType, typePredicate, minArgumentCount, hasRestParameter, hasStringLiterals) {
            var sig = new Signature(checker);
            sig.declaration = declaration;
            sig.typeParameters = typeParameters;
            sig.parameters = parameters;
            sig.resolvedReturnType = resolvedReturnType;
            sig.typePredicate = typePredicate;
            sig.minArgumentCount = minArgumentCount;
            sig.hasRestParameter = hasRestParameter;
            sig.hasStringLiterals = hasStringLiterals;
            return sig;
        }
        function cloneSignature(sig) {
            return createSignature(sig.declaration, sig.typeParameters, sig.parameters, sig.resolvedReturnType, sig.typePredicate, sig.minArgumentCount, sig.hasRestParameter, sig.hasStringLiterals);
        }
        function getDefaultConstructSignatures(classType) {
            var baseConstructorType = getBaseConstructorTypeOfClass(classType);
            var baseSignatures = getSignaturesOfType(baseConstructorType, 1 /* Construct */);
            if (baseSignatures.length === 0) {
                return [createSignature(undefined, classType.localTypeParameters, emptyArray, classType, /*typePredicate*/ undefined, 0, /*hasRestParameter*/ false, /*hasStringLiterals*/ false)];
            }
            var baseTypeNode = getBaseTypeNodeOfClass(classType);
            var typeArguments = ts.map(baseTypeNode.typeArguments, getTypeFromTypeNode);
            var typeArgCount = typeArguments ? typeArguments.length : 0;
            var result = [];
            for (var _i = 0, baseSignatures_1 = baseSignatures; _i < baseSignatures_1.length; _i++) {
                var baseSig = baseSignatures_1[_i];
                var typeParamCount = baseSig.typeParameters ? baseSig.typeParameters.length : 0;
                if (typeParamCount === typeArgCount) {
                    var sig = typeParamCount ? getSignatureInstantiation(baseSig, typeArguments) : cloneSignature(baseSig);
                    sig.typeParameters = classType.localTypeParameters;
                    sig.resolvedReturnType = classType;
                    result.push(sig);
                }
            }
            return result;
        }
        function createTupleTypeMemberSymbols(memberTypes) {
            var members = {};
            for (var i = 0; i < memberTypes.length; i++) {
                var symbol = createSymbol(4 /* Property */ | 67108864 /* Transient */, "" + i);
                symbol.type = memberTypes[i];
                members[i] = symbol;
            }
            return members;
        }
        function resolveTupleTypeMembers(type) {
            var arrayElementType = getUnionType(type.elementTypes, /*noSubtypeReduction*/ true);
            // Make the tuple type itself the 'this' type by including an extra type argument
            var arrayType = resolveStructuredTypeMembers(createTypeFromGenericGlobalType(globalArrayType, [arrayElementType, type]));
            var members = createTupleTypeMemberSymbols(type.elementTypes);
            addInheritedMembers(members, arrayType.properties);
            setObjectTypeMembers(type, members, arrayType.callSignatures, arrayType.constructSignatures, arrayType.stringIndexType, arrayType.numberIndexType);
        }
        function findMatchingSignature(signatureList, signature, partialMatch, ignoreReturnTypes) {
            for (var _i = 0, signatureList_1 = signatureList; _i < signatureList_1.length; _i++) {
                var s = signatureList_1[_i];
                if (compareSignaturesIdentical(s, signature, partialMatch, ignoreReturnTypes, compareTypesIdentical)) {
                    return s;
                }
            }
        }
        function findMatchingSignatures(signatureLists, signature, listIndex) {
            if (signature.typeParameters) {
                // We require an exact match for generic signatures, so we only return signatures from the first
                // signature list and only if they have exact matches in the other signature lists.
                if (listIndex > 0) {
                    return undefined;
                }
                for (var i = 1; i < signatureLists.length; i++) {
                    if (!findMatchingSignature(signatureLists[i], signature, /*partialMatch*/ false, /*ignoreReturnTypes*/ false)) {
                        return undefined;
                    }
                }
                return [signature];
            }
            var result = undefined;
            for (var i = 0; i < signatureLists.length; i++) {
                // Allow matching non-generic signatures to have excess parameters and different return types
                var match = i === listIndex ? signature : findMatchingSignature(signatureLists[i], signature, /*partialMatch*/ true, /*ignoreReturnTypes*/ true);
                if (!match) {
                    return undefined;
                }
                if (!ts.contains(result, match)) {
                    (result || (result = [])).push(match);
                }
            }
            return result;
        }
        // The signatures of a union type are those signatures that are present in each of the constituent types.
        // Generic signatures must match exactly, but non-generic signatures are allowed to have extra optional
        // parameters and may differ in return types. When signatures differ in return types, the resulting return
        // type is the union of the constituent return types.
        function getUnionSignatures(types, kind) {
            var signatureLists = ts.map(types, function (t) { return getSignaturesOfType(t, kind); });
            var result = undefined;
            for (var i = 0; i < signatureLists.length; i++) {
                for (var _i = 0, _a = signatureLists[i]; _i < _a.length; _i++) {
                    var signature = _a[_i];
                    // Only process signatures with parameter lists that aren't already in the result list
                    if (!result || !findMatchingSignature(result, signature, /*partialMatch*/ false, /*ignoreReturnTypes*/ true)) {
                        var unionSignatures = findMatchingSignatures(signatureLists, signature, i);
                        if (unionSignatures) {
                            var s = signature;
                            // Union the result types when more than one signature matches
                            if (unionSignatures.length > 1) {
                                s = cloneSignature(signature);
                                // Clear resolved return type we possibly got from cloneSignature
                                s.resolvedReturnType = undefined;
                                s.unionSignatures = unionSignatures;
                            }
                            (result || (result = [])).push(s);
                        }
                    }
                }
            }
            return result || emptyArray;
        }
        function getUnionIndexType(types, kind) {
            var indexTypes = [];
            for (var _i = 0, types_1 = types; _i < types_1.length; _i++) {
                var type = types_1[_i];
                var indexType = getIndexTypeOfType(type, kind);
                if (!indexType) {
                    return undefined;
                }
                indexTypes.push(indexType);
            }
            return getUnionType(indexTypes);
        }
        function resolveUnionTypeMembers(type) {
            // The members and properties collections are empty for union types. To get all properties of a union
            // type use getPropertiesOfType (only the language service uses this).
            var callSignatures = getUnionSignatures(type.types, 0 /* Call */);
            var constructSignatures = getUnionSignatures(type.types, 1 /* Construct */);
            var stringIndexType = getUnionIndexType(type.types, 0 /* String */);
            var numberIndexType = getUnionIndexType(type.types, 1 /* Number */);
            setObjectTypeMembers(type, emptySymbols, callSignatures, constructSignatures, stringIndexType, numberIndexType);
        }
        function intersectTypes(type1, type2) {
            return !type1 ? type2 : !type2 ? type1 : getIntersectionType([type1, type2]);
        }
        function resolveIntersectionTypeMembers(type) {
            // The members and properties collections are empty for intersection types. To get all properties of an
            // intersection type use getPropertiesOfType (only the language service uses this).
            var callSignatures = emptyArray;
            var constructSignatures = emptyArray;
            var stringIndexType = undefined;
            var numberIndexType = undefined;
            for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                var t = _a[_i];
                callSignatures = ts.concatenate(callSignatures, getSignaturesOfType(t, 0 /* Call */));
                constructSignatures = ts.concatenate(constructSignatures, getSignaturesOfType(t, 1 /* Construct */));
                stringIndexType = intersectTypes(stringIndexType, getIndexTypeOfType(t, 0 /* String */));
                numberIndexType = intersectTypes(numberIndexType, getIndexTypeOfType(t, 1 /* Number */));
            }
            setObjectTypeMembers(type, emptySymbols, callSignatures, constructSignatures, stringIndexType, numberIndexType);
        }
        function resolveAnonymousTypeMembers(type) {
            var symbol = type.symbol;
            if (type.target) {
                var members = createInstantiatedSymbolTable(getPropertiesOfObjectType(type.target), type.mapper, /*mappingThisOnly*/ false);
                var callSignatures = instantiateList(getSignaturesOfType(type.target, 0 /* Call */), type.mapper, instantiateSignature);
                var constructSignatures = instantiateList(getSignaturesOfType(type.target, 1 /* Construct */), type.mapper, instantiateSignature);
                var stringIndexType = instantiateType(getIndexTypeOfType(type.target, 0 /* String */), type.mapper);
                var numberIndexType = instantiateType(getIndexTypeOfType(type.target, 1 /* Number */), type.mapper);
                setObjectTypeMembers(type, members, callSignatures, constructSignatures, stringIndexType, numberIndexType);
            }
            else if (symbol.flags & 2048 /* TypeLiteral */) {
                var members = symbol.members;
                var callSignatures = getSignaturesOfSymbol(members["__call"]);
                var constructSignatures = getSignaturesOfSymbol(members["__new"]);
                var stringIndexType = getIndexTypeOfSymbol(symbol, 0 /* String */);
                var numberIndexType = getIndexTypeOfSymbol(symbol, 1 /* Number */);
                setObjectTypeMembers(type, members, callSignatures, constructSignatures, stringIndexType, numberIndexType);
            }
            else {
                // Combinations of function, class, enum and module
                var members = emptySymbols;
                var constructSignatures = emptyArray;
                if (symbol.flags & 1952 /* HasExports */) {
                    members = getExportsOfSymbol(symbol);
                }
                if (symbol.flags & 32 /* Class */) {
                    var classType = getDeclaredTypeOfClassOrInterface(symbol);
                    constructSignatures = getSignaturesOfSymbol(symbol.members["__constructor"]);
                    if (!constructSignatures.length) {
                        constructSignatures = getDefaultConstructSignatures(classType);
                    }
                    var baseConstructorType = getBaseConstructorTypeOfClass(classType);
                    if (baseConstructorType.flags & 80896 /* ObjectType */) {
                        members = createSymbolTable(getNamedMembers(members));
                        addInheritedMembers(members, getPropertiesOfObjectType(baseConstructorType));
                    }
                }
                var numberIndexType = (symbol.flags & 384 /* Enum */) ? stringType : undefined;
                setObjectTypeMembers(type, members, emptyArray, constructSignatures, undefined, numberIndexType);
                // We resolve the members before computing the signatures because a signature may use
                // typeof with a qualified name expression that circularly references the type we are
                // in the process of resolving (see issue #6072). The temporarily empty signature list
                // will never be observed because a qualified name can't reference signatures.
                if (symbol.flags & (16 /* Function */ | 8192 /* Method */)) {
                    type.callSignatures = getSignaturesOfSymbol(symbol);
                }
            }
        }
        function resolveStructuredTypeMembers(type) {
            if (!type.members) {
                if (type.flags & 4096 /* Reference */) {
                    resolveTypeReferenceMembers(type);
                }
                else if (type.flags & (1024 /* Class */ | 2048 /* Interface */)) {
                    resolveClassOrInterfaceMembers(type);
                }
                else if (type.flags & 65536 /* Anonymous */) {
                    resolveAnonymousTypeMembers(type);
                }
                else if (type.flags & 8192 /* Tuple */) {
                    resolveTupleTypeMembers(type);
                }
                else if (type.flags & 16384 /* Union */) {
                    resolveUnionTypeMembers(type);
                }
                else if (type.flags & 32768 /* Intersection */) {
                    resolveIntersectionTypeMembers(type);
                }
            }
            return type;
        }
        /** Return properties of an object type or an empty array for other types */
        function getPropertiesOfObjectType(type) {
            if (type.flags & 80896 /* ObjectType */) {
                return resolveStructuredTypeMembers(type).properties;
            }
            return emptyArray;
        }
        /** If the given type is an object type and that type has a property by the given name,
         * return the symbol for that property. Otherwise return undefined. */
        function getPropertyOfObjectType(type, name) {
            if (type.flags & 80896 /* ObjectType */) {
                var resolved = resolveStructuredTypeMembers(type);
                if (ts.hasProperty(resolved.members, name)) {
                    var symbol = resolved.members[name];
                    if (symbolIsValue(symbol)) {
                        return symbol;
                    }
                }
            }
        }
        function getPropertiesOfUnionOrIntersectionType(type) {
            for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                var current = _a[_i];
                for (var _b = 0, _c = getPropertiesOfType(current); _b < _c.length; _b++) {
                    var prop = _c[_b];
                    getPropertyOfUnionOrIntersectionType(type, prop.name);
                }
                // The properties of a union type are those that are present in all constituent types, so
                // we only need to check the properties of the first type
                if (type.flags & 16384 /* Union */) {
                    break;
                }
            }
            return type.resolvedProperties ? symbolsToArray(type.resolvedProperties) : emptyArray;
        }
        function getPropertiesOfType(type) {
            type = getApparentType(type);
            return type.flags & 49152 /* UnionOrIntersection */ ? getPropertiesOfUnionOrIntersectionType(type) : getPropertiesOfObjectType(type);
        }
        /**
         * The apparent type of a type parameter is the base constraint instantiated with the type parameter
         * as the type argument for the 'this' type.
         */
        function getApparentTypeOfTypeParameter(type) {
            if (!type.resolvedApparentType) {
                var constraintType = getConstraintOfTypeParameter(type);
                while (constraintType && constraintType.flags & 512 /* TypeParameter */) {
                    constraintType = getConstraintOfTypeParameter(constraintType);
                }
                type.resolvedApparentType = getTypeWithThisArgument(constraintType || emptyObjectType, type);
            }
            return type.resolvedApparentType;
        }
        /**
         * For a type parameter, return the base constraint of the type parameter. For the string, number,
         * boolean, and symbol primitive types, return the corresponding object types. Otherwise return the
         * type itself. Note that the apparent type of a union type is the union type itself.
         */
        function getApparentType(type) {
            if (type.flags & 512 /* TypeParameter */) {
                type = getApparentTypeOfTypeParameter(type);
            }
            if (type.flags & 258 /* StringLike */) {
                type = globalStringType;
            }
            else if (type.flags & 132 /* NumberLike */) {
                type = globalNumberType;
            }
            else if (type.flags & 8 /* Boolean */) {
                type = globalBooleanType;
            }
            else if (type.flags & 16777216 /* ESSymbol */) {
                type = globalESSymbolType;
            }
            return type;
        }
        function createUnionOrIntersectionProperty(containingType, name) {
            var types = containingType.types;
            var props;
            // Flags we want to propagate to the result if they exist in all source symbols
            var commonFlags = (containingType.flags & 32768 /* Intersection */) ? 536870912 /* Optional */ : 0 /* None */;
            for (var _i = 0, types_2 = types; _i < types_2.length; _i++) {
                var current = types_2[_i];
                var type = getApparentType(current);
                if (type !== unknownType) {
                    var prop = getPropertyOfType(type, name);
                    if (prop && !(getDeclarationFlagsFromSymbol(prop) & (16 /* Private */ | 32 /* Protected */))) {
                        commonFlags &= prop.flags;
                        if (!props) {
                            props = [prop];
                        }
                        else if (!ts.contains(props, prop)) {
                            props.push(prop);
                        }
                    }
                    else if (containingType.flags & 16384 /* Union */) {
                        // A union type requires the property to be present in all constituent types
                        return undefined;
                    }
                }
            }
            if (!props) {
                return undefined;
            }
            if (props.length === 1) {
                return props[0];
            }
            var propTypes = [];
            var declarations = [];
            for (var _a = 0, props_1 = props; _a < props_1.length; _a++) {
                var prop = props_1[_a];
                if (prop.declarations) {
                    ts.addRange(declarations, prop.declarations);
                }
                propTypes.push(getTypeOfSymbol(prop));
            }
            var result = createSymbol(4 /* Property */ |
                67108864 /* Transient */ |
                268435456 /* SyntheticProperty */ |
                commonFlags, name);
            result.containingType = containingType;
            result.declarations = declarations;
            result.type = containingType.flags & 16384 /* Union */ ? getUnionType(propTypes) : getIntersectionType(propTypes);
            return result;
        }
        function getPropertyOfUnionOrIntersectionType(type, name) {
            var properties = type.resolvedProperties || (type.resolvedProperties = {});
            if (ts.hasProperty(properties, name)) {
                return properties[name];
            }
            var property = createUnionOrIntersectionProperty(type, name);
            if (property) {
                properties[name] = property;
            }
            return property;
        }
        // Return the symbol for the property with the given name in the given type. Creates synthetic union properties when
        // necessary, maps primitive types and type parameters are to their apparent types, and augments with properties from
        // Object and Function as appropriate.
        function getPropertyOfType(type, name) {
            type = getApparentType(type);
            if (type.flags & 80896 /* ObjectType */) {
                var resolved = resolveStructuredTypeMembers(type);
                if (ts.hasProperty(resolved.members, name)) {
                    var symbol = resolved.members[name];
                    if (symbolIsValue(symbol)) {
                        return symbol;
                    }
                }
                if (resolved === anyFunctionType || resolved.callSignatures.length || resolved.constructSignatures.length) {
                    var symbol = getPropertyOfObjectType(globalFunctionType, name);
                    if (symbol) {
                        return symbol;
                    }
                }
                return getPropertyOfObjectType(globalObjectType, name);
            }
            if (type.flags & 49152 /* UnionOrIntersection */) {
                return getPropertyOfUnionOrIntersectionType(type, name);
            }
            return undefined;
        }
        function getSignaturesOfStructuredType(type, kind) {
            if (type.flags & 130048 /* StructuredType */) {
                var resolved = resolveStructuredTypeMembers(type);
                return kind === 0 /* Call */ ? resolved.callSignatures : resolved.constructSignatures;
            }
            return emptyArray;
        }
        /**
         * Return the signatures of the given kind in the given type. Creates synthetic union signatures when necessary and
         * maps primitive types and type parameters are to their apparent types.
         */
        function getSignaturesOfType(type, kind) {
            return getSignaturesOfStructuredType(getApparentType(type), kind);
        }
        function getIndexTypeOfStructuredType(type, kind) {
            if (type.flags & 130048 /* StructuredType */) {
                var resolved = resolveStructuredTypeMembers(type);
                return kind === 0 /* String */ ? resolved.stringIndexType : resolved.numberIndexType;
            }
        }
        // Return the index type of the given kind in the given type. Creates synthetic union index types when necessary and
        // maps primitive types and type parameters are to their apparent types.
        function getIndexTypeOfType(type, kind) {
            return getIndexTypeOfStructuredType(getApparentType(type), kind);
        }
        function getTypeParametersFromJSDocTemplate(declaration) {
            if (declaration.parserContextFlags & 32 /* JavaScriptFile */) {
                var templateTag = ts.getJSDocTemplateTag(declaration);
                if (templateTag) {
                    return getTypeParametersFromDeclaration(templateTag.typeParameters);
                }
            }
            return undefined;
        }
        // Return list of type parameters with duplicates removed (duplicate identifier errors are generated in the actual
        // type checking functions).
        function getTypeParametersFromDeclaration(typeParameterDeclarations) {
            var result = [];
            ts.forEach(typeParameterDeclarations, function (node) {
                var tp = getDeclaredTypeOfTypeParameter(node.symbol);
                if (!ts.contains(result, tp)) {
                    result.push(tp);
                }
            });
            return result;
        }
        function symbolsToArray(symbols) {
            var result = [];
            for (var id in symbols) {
                if (!isReservedMemberName(id)) {
                    result.push(symbols[id]);
                }
            }
            return result;
        }
        function isOptionalParameter(node) {
            if (node.parserContextFlags & 32 /* JavaScriptFile */) {
                if (node.type && node.type.kind === 263 /* JSDocOptionalType */) {
                    return true;
                }
                var paramTag = ts.getCorrespondingJSDocParameterTag(node);
                if (paramTag) {
                    if (paramTag.isBracketed) {
                        return true;
                    }
                    if (paramTag.typeExpression) {
                        return paramTag.typeExpression.type.kind === 263 /* JSDocOptionalType */;
                    }
                }
            }
            if (ts.hasQuestionToken(node)) {
                return true;
            }
            if (node.initializer) {
                var signatureDeclaration = node.parent;
                var signature = getSignatureFromDeclaration(signatureDeclaration);
                var parameterIndex = ts.indexOf(signatureDeclaration.parameters, node);
                ts.Debug.assert(parameterIndex >= 0);
                return parameterIndex >= signature.minArgumentCount;
            }
            return false;
        }
        function createTypePredicateFromTypePredicateNode(node) {
            if (node.parameterName.kind === 69 /* Identifier */) {
                var parameterName = node.parameterName;
                return {
                    kind: 1 /* Identifier */,
                    parameterName: parameterName ? parameterName.text : undefined,
                    parameterIndex: parameterName ? getTypePredicateParameterIndex(node.parent.parameters, parameterName) : undefined,
                    type: getTypeFromTypeNode(node.type)
                };
            }
            else {
                return {
                    kind: 0 /* This */,
                    type: getTypeFromTypeNode(node.type)
                };
            }
        }
        function getSignatureFromDeclaration(declaration) {
            var links = getNodeLinks(declaration);
            if (!links.resolvedSignature) {
                var classType = declaration.kind === 145 /* Constructor */ ?
                    getDeclaredTypeOfClassOrInterface(getMergedSymbol(declaration.parent.symbol))
                    : undefined;
                var typeParameters = classType ? classType.localTypeParameters :
                    declaration.typeParameters ? getTypeParametersFromDeclaration(declaration.typeParameters) :
                        getTypeParametersFromJSDocTemplate(declaration);
                var parameters = [];
                var hasStringLiterals = false;
                var minArgumentCount = -1;
                var isJSConstructSignature = ts.isJSDocConstructSignature(declaration);
                var returnType = undefined;
                var typePredicate = undefined;
                // If this is a JSDoc construct signature, then skip the first parameter in the
                // parameter list.  The first parameter represents the return type of the construct
                // signature.
                for (var i = isJSConstructSignature ? 1 : 0, n = declaration.parameters.length; i < n; i++) {
                    var param = declaration.parameters[i];
                    var paramSymbol = param.symbol;
                    // Include parameter symbol instead of property symbol in the signature
                    if (paramSymbol && !!(paramSymbol.flags & 4 /* Property */) && !ts.isBindingPattern(param.name)) {
                        var resolvedSymbol = resolveName(param, paramSymbol.name, 107455 /* Value */, undefined, undefined);
                        paramSymbol = resolvedSymbol;
                    }
                    parameters.push(paramSymbol);
                    if (param.type && param.type.kind === 163 /* StringLiteralType */) {
                        hasStringLiterals = true;
                    }
                    if (param.initializer || param.questionToken || param.dotDotDotToken) {
                        if (minArgumentCount < 0) {
                            minArgumentCount = i;
                        }
                    }
                    else {
                        // If we see any required parameters, it means the prior ones were not in fact optional.
                        minArgumentCount = -1;
                    }
                }
                if (minArgumentCount < 0) {
                    minArgumentCount = declaration.parameters.length;
                }
                if (isJSConstructSignature) {
                    minArgumentCount--;
                    returnType = getTypeFromTypeNode(declaration.parameters[0].type);
                }
                else if (classType) {
                    returnType = classType;
                }
                else if (declaration.type) {
                    returnType = getTypeFromTypeNode(declaration.type);
                    if (declaration.type.kind === 151 /* TypePredicate */) {
                        typePredicate = createTypePredicateFromTypePredicateNode(declaration.type);
                    }
                }
                else {
                    if (declaration.parserContextFlags & 32 /* JavaScriptFile */) {
                        var type = getReturnTypeFromJSDocComment(declaration);
                        if (type && type !== unknownType) {
                            returnType = type;
                        }
                    }
                    // TypeScript 1.0 spec (April 2014):
                    // If only one accessor includes a type annotation, the other behaves as if it had the same type annotation.
                    if (declaration.kind === 146 /* GetAccessor */ && !ts.hasDynamicName(declaration)) {
                        var setter = ts.getDeclarationOfKind(declaration.symbol, 147 /* SetAccessor */);
                        returnType = getAnnotatedAccessorType(setter);
                    }
                    if (!returnType && ts.nodeIsMissing(declaration.body)) {
                        returnType = anyType;
                    }
                }
                links.resolvedSignature = createSignature(declaration, typeParameters, parameters, returnType, typePredicate, minArgumentCount, ts.hasRestParameter(declaration), hasStringLiterals);
            }
            return links.resolvedSignature;
        }
        function getSignaturesOfSymbol(symbol) {
            if (!symbol)
                return emptyArray;
            var result = [];
            for (var i = 0, len = symbol.declarations.length; i < len; i++) {
                var node = symbol.declarations[i];
                switch (node.kind) {
                    case 153 /* FunctionType */:
                    case 154 /* ConstructorType */:
                    case 216 /* FunctionDeclaration */:
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                    case 145 /* Constructor */:
                    case 148 /* CallSignature */:
                    case 149 /* ConstructSignature */:
                    case 150 /* IndexSignature */:
                    case 146 /* GetAccessor */:
                    case 147 /* SetAccessor */:
                    case 176 /* FunctionExpression */:
                    case 177 /* ArrowFunction */:
                    case 264 /* JSDocFunctionType */:
                        // Don't include signature if node is the implementation of an overloaded function. A node is considered
                        // an implementation node if it has a body and the previous node is of the same kind and immediately
                        // precedes the implementation node (i.e. has the same parent and ends where the implementation starts).
                        if (i > 0 && node.body) {
                            var previous = symbol.declarations[i - 1];
                            if (node.parent === previous.parent && node.kind === previous.kind && node.pos === previous.end) {
                                break;
                            }
                        }
                        result.push(getSignatureFromDeclaration(node));
                }
            }
            return result;
        }
        function resolveExternalModuleTypeByLiteral(name) {
            var moduleSym = resolveExternalModuleName(name, name);
            if (moduleSym) {
                var resolvedModuleSymbol = resolveExternalModuleSymbol(moduleSym);
                if (resolvedModuleSymbol) {
                    return getTypeOfSymbol(resolvedModuleSymbol);
                }
            }
            return anyType;
        }
        function getReturnTypeOfSignature(signature) {
            if (!signature.resolvedReturnType) {
                if (!pushTypeResolution(signature, 3 /* ResolvedReturnType */)) {
                    return unknownType;
                }
                var type = void 0;
                if (signature.target) {
                    type = instantiateType(getReturnTypeOfSignature(signature.target), signature.mapper);
                }
                else if (signature.unionSignatures) {
                    type = getUnionType(ts.map(signature.unionSignatures, getReturnTypeOfSignature));
                }
                else {
                    type = getReturnTypeFromBody(signature.declaration);
                }
                if (!popTypeResolution()) {
                    type = anyType;
                    if (compilerOptions.noImplicitAny) {
                        var declaration = signature.declaration;
                        if (declaration.name) {
                            error(declaration.name, ts.Diagnostics._0_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions, ts.declarationNameToString(declaration.name));
                        }
                        else {
                            error(declaration, ts.Diagnostics.Function_implicitly_has_return_type_any_because_it_does_not_have_a_return_type_annotation_and_is_referenced_directly_or_indirectly_in_one_of_its_return_expressions);
                        }
                    }
                }
                signature.resolvedReturnType = type;
            }
            return signature.resolvedReturnType;
        }
        function getRestTypeOfSignature(signature) {
            if (signature.hasRestParameter) {
                var type = getTypeOfSymbol(ts.lastOrUndefined(signature.parameters));
                if (type.flags & 4096 /* Reference */ && type.target === globalArrayType) {
                    return type.typeArguments[0];
                }
            }
            return anyType;
        }
        function getSignatureInstantiation(signature, typeArguments) {
            return instantiateSignature(signature, createTypeMapper(signature.typeParameters, typeArguments), /*eraseTypeParameters*/ true);
        }
        function getErasedSignature(signature) {
            if (!signature.typeParameters)
                return signature;
            if (!signature.erasedSignatureCache) {
                if (signature.target) {
                    signature.erasedSignatureCache = instantiateSignature(getErasedSignature(signature.target), signature.mapper);
                }
                else {
                    signature.erasedSignatureCache = instantiateSignature(signature, createTypeEraser(signature.typeParameters), /*eraseTypeParameters*/ true);
                }
            }
            return signature.erasedSignatureCache;
        }
        function getOrCreateTypeFromSignature(signature) {
            // There are two ways to declare a construct signature, one is by declaring a class constructor
            // using the constructor keyword, and the other is declaring a bare construct signature in an
            // object type literal or interface (using the new keyword). Each way of declaring a constructor
            // will result in a different declaration kind.
            if (!signature.isolatedSignatureType) {
                var isConstructor = signature.declaration.kind === 145 /* Constructor */ || signature.declaration.kind === 149 /* ConstructSignature */;
                var type = createObjectType(65536 /* Anonymous */ | 262144 /* FromSignature */);
                type.members = emptySymbols;
                type.properties = emptyArray;
                type.callSignatures = !isConstructor ? [signature] : emptyArray;
                type.constructSignatures = isConstructor ? [signature] : emptyArray;
                signature.isolatedSignatureType = type;
            }
            return signature.isolatedSignatureType;
        }
        function getIndexSymbol(symbol) {
            return symbol.members["__index"];
        }
        function getIndexDeclarationOfSymbol(symbol, kind) {
            var syntaxKind = kind === 1 /* Number */ ? 128 /* NumberKeyword */ : 130 /* StringKeyword */;
            var indexSymbol = getIndexSymbol(symbol);
            if (indexSymbol) {
                for (var _i = 0, _a = indexSymbol.declarations; _i < _a.length; _i++) {
                    var decl = _a[_i];
                    var node = decl;
                    if (node.parameters.length === 1) {
                        var parameter = node.parameters[0];
                        if (parameter && parameter.type && parameter.type.kind === syntaxKind) {
                            return node;
                        }
                    }
                }
            }
            return undefined;
        }
        function getIndexTypeOfSymbol(symbol, kind) {
            var declaration = getIndexDeclarationOfSymbol(symbol, kind);
            return declaration
                ? declaration.type ? getTypeFromTypeNode(declaration.type) : anyType
                : undefined;
        }
        function getConstraintDeclaration(type) {
            return ts.getDeclarationOfKind(type.symbol, 138 /* TypeParameter */).constraint;
        }
        function hasConstraintReferenceTo(type, target) {
            var checked;
            while (type && !(type.flags & 33554432 /* ThisType */) && type.flags & 512 /* TypeParameter */ && !ts.contains(checked, type)) {
                if (type === target) {
                    return true;
                }
                (checked || (checked = [])).push(type);
                var constraintDeclaration = getConstraintDeclaration(type);
                type = constraintDeclaration && getTypeFromTypeNode(constraintDeclaration);
            }
            return false;
        }
        function getConstraintOfTypeParameter(typeParameter) {
            if (!typeParameter.constraint) {
                if (typeParameter.target) {
                    var targetConstraint = getConstraintOfTypeParameter(typeParameter.target);
                    typeParameter.constraint = targetConstraint ? instantiateType(targetConstraint, typeParameter.mapper) : noConstraintType;
                }
                else {
                    var constraintDeclaration = getConstraintDeclaration(typeParameter);
                    var constraint = getTypeFromTypeNode(constraintDeclaration);
                    if (hasConstraintReferenceTo(constraint, typeParameter)) {
                        error(constraintDeclaration, ts.Diagnostics.Type_parameter_0_has_a_circular_constraint, typeToString(typeParameter));
                        constraint = unknownType;
                    }
                    typeParameter.constraint = constraint;
                }
            }
            return typeParameter.constraint === noConstraintType ? undefined : typeParameter.constraint;
        }
        function getParentSymbolOfTypeParameter(typeParameter) {
            return getSymbolOfNode(ts.getDeclarationOfKind(typeParameter.symbol, 138 /* TypeParameter */).parent);
        }
        function getTypeListId(types) {
            if (types) {
                switch (types.length) {
                    case 1:
                        return "" + types[0].id;
                    case 2:
                        return types[0].id + "," + types[1].id;
                    default:
                        var result = "";
                        for (var i = 0; i < types.length; i++) {
                            if (i > 0) {
                                result += ",";
                            }
                            result += types[i].id;
                        }
                        return result;
                }
            }
            return "";
        }
        // This function is used to propagate certain flags when creating new object type references and union types.
        // It is only necessary to do so if a constituent type might be the undefined type, the null type, the type
        // of an object literal or the anyFunctionType. This is because there are operations in the type checker
        // that care about the presence of such types at arbitrary depth in a containing type.
        function getPropagatingFlagsOfTypes(types) {
            var result = 0;
            for (var _i = 0, types_3 = types; _i < types_3.length; _i++) {
                var type = types_3[_i];
                result |= type.flags;
            }
            return result & 14680064 /* PropagatingFlags */;
        }
        function createTypeReference(target, typeArguments) {
            var id = getTypeListId(typeArguments);
            var type = target.instantiations[id];
            if (!type) {
                var flags = 4096 /* Reference */ | (typeArguments ? getPropagatingFlagsOfTypes(typeArguments) : 0);
                type = target.instantiations[id] = createObjectType(flags, target.symbol);
                type.target = target;
                type.typeArguments = typeArguments;
            }
            return type;
        }
        // Get type from reference to class or interface
        function getTypeFromClassOrInterfaceReference(node, symbol) {
            var type = getDeclaredTypeOfSymbol(symbol);
            var typeParameters = type.localTypeParameters;
            if (typeParameters) {
                if (!node.typeArguments || node.typeArguments.length !== typeParameters.length) {
                    error(node, ts.Diagnostics.Generic_type_0_requires_1_type_argument_s, typeToString(type, /*enclosingDeclaration*/ undefined, 1 /* WriteArrayAsGenericType */), typeParameters.length);
                    return unknownType;
                }
                // In a type reference, the outer type parameters of the referenced class or interface are automatically
                // supplied as type arguments and the type reference only specifies arguments for the local type parameters
                // of the class or interface.
                return createTypeReference(type, ts.concatenate(type.outerTypeParameters, ts.map(node.typeArguments, getTypeFromTypeNode)));
            }
            if (node.typeArguments) {
                error(node, ts.Diagnostics.Type_0_is_not_generic, typeToString(type));
                return unknownType;
            }
            return type;
        }
        // Get type from reference to type alias. When a type alias is generic, the declared type of the type alias may include
        // references to the type parameters of the alias. We replace those with the actual type arguments by instantiating the
        // declared type. Instantiations are cached using the type identities of the type arguments as the key.
        function getTypeFromTypeAliasReference(node, symbol) {
            var type = getDeclaredTypeOfSymbol(symbol);
            var links = getSymbolLinks(symbol);
            var typeParameters = links.typeParameters;
            if (typeParameters) {
                if (!node.typeArguments || node.typeArguments.length !== typeParameters.length) {
                    error(node, ts.Diagnostics.Generic_type_0_requires_1_type_argument_s, symbolToString(symbol), typeParameters.length);
                    return unknownType;
                }
                var typeArguments = ts.map(node.typeArguments, getTypeFromTypeNode);
                var id = getTypeListId(typeArguments);
                return links.instantiations[id] || (links.instantiations[id] = instantiateType(type, createTypeMapper(typeParameters, typeArguments)));
            }
            if (node.typeArguments) {
                error(node, ts.Diagnostics.Type_0_is_not_generic, symbolToString(symbol));
                return unknownType;
            }
            return type;
        }
        // Get type from reference to named type that cannot be generic (enum or type parameter)
        function getTypeFromNonGenericTypeReference(node, symbol) {
            if (node.typeArguments) {
                error(node, ts.Diagnostics.Type_0_is_not_generic, symbolToString(symbol));
                return unknownType;
            }
            return getDeclaredTypeOfSymbol(symbol);
        }
        function getTypeReferenceName(node) {
            switch (node.kind) {
                case 152 /* TypeReference */:
                    return node.typeName;
                case 262 /* JSDocTypeReference */:
                    return node.name;
                case 191 /* ExpressionWithTypeArguments */:
                    // We only support expressions that are simple qualified names. For other
                    // expressions this produces undefined.
                    if (ts.isSupportedExpressionWithTypeArguments(node)) {
                        return node.expression;
                    }
            }
            return undefined;
        }
        function resolveTypeReferenceName(node, typeReferenceName) {
            if (!typeReferenceName) {
                return unknownSymbol;
            }
            return resolveEntityName(typeReferenceName, 793056 /* Type */) || unknownSymbol;
        }
        function getTypeReferenceType(node, symbol) {
            if (symbol === unknownSymbol) {
                return unknownType;
            }
            if (symbol.flags & (32 /* Class */ | 64 /* Interface */)) {
                return getTypeFromClassOrInterfaceReference(node, symbol);
            }
            if (symbol.flags & 524288 /* TypeAlias */) {
                return getTypeFromTypeAliasReference(node, symbol);
            }
            if (symbol.flags & 107455 /* Value */ && node.kind === 262 /* JSDocTypeReference */) {
                // A JSDocTypeReference may have resolved to a value (as opposed to a type). In
                // that case, the type of this reference is just the type of the value we resolved
                // to.
                return getTypeOfSymbol(symbol);
            }
            return getTypeFromNonGenericTypeReference(node, symbol);
        }
        function getTypeFromTypeReference(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                var symbol = void 0;
                var type = void 0;
                if (node.kind === 262 /* JSDocTypeReference */) {
                    var typeReferenceName = getTypeReferenceName(node);
                    symbol = resolveTypeReferenceName(node, typeReferenceName);
                    type = getTypeReferenceType(node, symbol);
                    links.resolvedSymbol = symbol;
                    links.resolvedType = type;
                }
                else {
                    // We only support expressions that are simple qualified names. For other expressions this produces undefined.
                    var typeNameOrExpression = node.kind === 152 /* TypeReference */ ? node.typeName :
                        ts.isSupportedExpressionWithTypeArguments(node) ? node.expression :
                            undefined;
                    symbol = typeNameOrExpression && resolveEntityName(typeNameOrExpression, 793056 /* Type */) || unknownSymbol;
                    type = symbol === unknownSymbol ? unknownType :
                        symbol.flags & (32 /* Class */ | 64 /* Interface */) ? getTypeFromClassOrInterfaceReference(node, symbol) :
                            symbol.flags & 524288 /* TypeAlias */ ? getTypeFromTypeAliasReference(node, symbol) :
                                getTypeFromNonGenericTypeReference(node, symbol);
                }
                // Cache both the resolved symbol and the resolved type. The resolved symbol is needed in when we check the
                // type reference in checkTypeReferenceOrExpressionWithTypeArguments.
                links.resolvedSymbol = symbol;
                links.resolvedType = type;
            }
            return links.resolvedType;
        }
        function getTypeFromTypeQueryNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                // TypeScript 1.0 spec (April 2014): 3.6.3
                // The expression is processed as an identifier expression (section 4.3)
                // or property access expression(section 4.10),
                // the widened type(section 3.9) of which becomes the result.
                links.resolvedType = getWidenedType(checkExpression(node.exprName));
            }
            return links.resolvedType;
        }
        function getTypeOfGlobalSymbol(symbol, arity) {
            function getTypeDeclaration(symbol) {
                var declarations = symbol.declarations;
                for (var _i = 0, declarations_2 = declarations; _i < declarations_2.length; _i++) {
                    var declaration = declarations_2[_i];
                    switch (declaration.kind) {
                        case 217 /* ClassDeclaration */:
                        case 218 /* InterfaceDeclaration */:
                        case 220 /* EnumDeclaration */:
                            return declaration;
                    }
                }
            }
            if (!symbol) {
                return arity ? emptyGenericType : emptyObjectType;
            }
            var type = getDeclaredTypeOfSymbol(symbol);
            if (!(type.flags & 80896 /* ObjectType */)) {
                error(getTypeDeclaration(symbol), ts.Diagnostics.Global_type_0_must_be_a_class_or_interface_type, symbol.name);
                return arity ? emptyGenericType : emptyObjectType;
            }
            if ((type.typeParameters ? type.typeParameters.length : 0) !== arity) {
                error(getTypeDeclaration(symbol), ts.Diagnostics.Global_type_0_must_have_1_type_parameter_s, symbol.name, arity);
                return arity ? emptyGenericType : emptyObjectType;
            }
            return type;
        }
        function getGlobalValueSymbol(name) {
            return getGlobalSymbol(name, 107455 /* Value */, ts.Diagnostics.Cannot_find_global_value_0);
        }
        function getGlobalTypeSymbol(name) {
            return getGlobalSymbol(name, 793056 /* Type */, ts.Diagnostics.Cannot_find_global_type_0);
        }
        function getGlobalSymbol(name, meaning, diagnostic) {
            return resolveName(undefined, name, meaning, diagnostic, name);
        }
        function getGlobalType(name, arity) {
            if (arity === void 0) { arity = 0; }
            return getTypeOfGlobalSymbol(getGlobalTypeSymbol(name), arity);
        }
        /**
         * Returns a type that is inside a namespace at the global scope, e.g.
         * getExportedTypeFromNamespace('JSX', 'Element') returns the JSX.Element type
         */
        function getExportedTypeFromNamespace(namespace, name) {
            var namespaceSymbol = getGlobalSymbol(namespace, 1536 /* Namespace */, /*diagnosticMessage*/ undefined);
            var typeSymbol = namespaceSymbol && getSymbol(namespaceSymbol.exports, name, 793056 /* Type */);
            return typeSymbol && getDeclaredTypeOfSymbol(typeSymbol);
        }
        function getGlobalESSymbolConstructorSymbol() {
            return globalESSymbolConstructorSymbol || (globalESSymbolConstructorSymbol = getGlobalValueSymbol("Symbol"));
        }
        /**
          * Creates a TypeReference for a generic `TypedPropertyDescriptor<T>`.
          */
        function createTypedPropertyDescriptorType(propertyType) {
            var globalTypedPropertyDescriptorType = getGlobalTypedPropertyDescriptorType();
            return globalTypedPropertyDescriptorType !== emptyGenericType
                ? createTypeReference(globalTypedPropertyDescriptorType, [propertyType])
                : emptyObjectType;
        }
        /**
         * Instantiates a global type that is generic with some element type, and returns that instantiation.
         */
        function createTypeFromGenericGlobalType(genericGlobalType, typeArguments) {
            return genericGlobalType !== emptyGenericType ? createTypeReference(genericGlobalType, typeArguments) : emptyObjectType;
        }
        function createIterableType(elementType) {
            return createTypeFromGenericGlobalType(globalIterableType, [elementType]);
        }
        function createIterableIteratorType(elementType) {
            return createTypeFromGenericGlobalType(globalIterableIteratorType, [elementType]);
        }
        function createArrayType(elementType) {
            return createTypeFromGenericGlobalType(globalArrayType, [elementType]);
        }
        function getTypeFromArrayTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = createArrayType(getTypeFromTypeNode(node.elementType));
            }
            return links.resolvedType;
        }
        function createTupleType(elementTypes) {
            var id = getTypeListId(elementTypes);
            return tupleTypes[id] || (tupleTypes[id] = createNewTupleType(elementTypes));
        }
        function createNewTupleType(elementTypes) {
            var type = createObjectType(8192 /* Tuple */ | getPropagatingFlagsOfTypes(elementTypes));
            type.elementTypes = elementTypes;
            return type;
        }
        function getTypeFromTupleTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = createTupleType(ts.map(node.elementTypes, getTypeFromTypeNode));
            }
            return links.resolvedType;
        }
        function addTypeToSet(typeSet, type, typeSetKind) {
            if (type.flags & typeSetKind) {
                addTypesToSet(typeSet, type.types, typeSetKind);
            }
            else if (!ts.contains(typeSet, type)) {
                typeSet.push(type);
            }
        }
        // Add the given types to the given type set. Order is preserved, duplicates are removed,
        // and nested types of the given kind are flattened into the set.
        function addTypesToSet(typeSet, types, typeSetKind) {
            for (var _i = 0, types_4 = types; _i < types_4.length; _i++) {
                var type = types_4[_i];
                addTypeToSet(typeSet, type, typeSetKind);
            }
        }
        function isSubtypeOfAny(candidate, types) {
            for (var i = 0, len = types.length; i < len; i++) {
                if (candidate !== types[i] && isTypeSubtypeOf(candidate, types[i])) {
                    return true;
                }
            }
            return false;
        }
        function removeSubtypes(types) {
            var i = types.length;
            while (i > 0) {
                i--;
                if (isSubtypeOfAny(types[i], types)) {
                    types.splice(i, 1);
                }
            }
        }
        function containsTypeAny(types) {
            for (var _i = 0, types_5 = types; _i < types_5.length; _i++) {
                var type = types_5[_i];
                if (isTypeAny(type)) {
                    return true;
                }
            }
            return false;
        }
        function removeAllButLast(types, typeToRemove) {
            var i = types.length;
            while (i > 0 && types.length > 1) {
                i--;
                if (types[i] === typeToRemove) {
                    types.splice(i, 1);
                }
            }
        }
        // We reduce the constituent type set to only include types that aren't subtypes of other types, unless
        // the noSubtypeReduction flag is specified, in which case we perform a simple deduplication based on
        // object identity. Subtype reduction is possible only when union types are known not to circularly
        // reference themselves (as is the case with union types created by expression constructs such as array
        // literals and the || and ?: operators). Named types can circularly reference themselves and therefore
        // cannot be deduplicated during their declaration. For example, "type Item = string | (() => Item" is
        // a named type that circularly references itself.
        function getUnionType(types, noSubtypeReduction) {
            if (types.length === 0) {
                return emptyUnionType;
            }
            var typeSet = [];
            addTypesToSet(typeSet, types, 16384 /* Union */);
            if (containsTypeAny(typeSet)) {
                return anyType;
            }
            if (noSubtypeReduction) {
                removeAllButLast(typeSet, undefinedType);
                removeAllButLast(typeSet, nullType);
            }
            else {
                removeSubtypes(typeSet);
            }
            if (typeSet.length === 1) {
                return typeSet[0];
            }
            var id = getTypeListId(typeSet);
            var type = unionTypes[id];
            if (!type) {
                type = unionTypes[id] = createObjectType(16384 /* Union */ | getPropagatingFlagsOfTypes(typeSet));
                type.types = typeSet;
            }
            return type;
        }
        function getTypeFromUnionTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = getUnionType(ts.map(node.types, getTypeFromTypeNode), /*noSubtypeReduction*/ true);
            }
            return links.resolvedType;
        }
        // We do not perform structural deduplication on intersection types. Intersection types are created only by the &
        // type operator and we can't reduce those because we want to support recursive intersection types. For example,
        // a type alias of the form "type List<T> = T & { next: List<T> }" cannot be reduced during its declaration.
        // Also, unlike union types, the order of the constituent types is preserved in order that overload resolution
        // for intersections of types with signatures can be deterministic.
        function getIntersectionType(types) {
            if (types.length === 0) {
                return emptyObjectType;
            }
            var typeSet = [];
            addTypesToSet(typeSet, types, 32768 /* Intersection */);
            if (containsTypeAny(typeSet)) {
                return anyType;
            }
            if (typeSet.length === 1) {
                return typeSet[0];
            }
            var id = getTypeListId(typeSet);
            var type = intersectionTypes[id];
            if (!type) {
                type = intersectionTypes[id] = createObjectType(32768 /* Intersection */ | getPropagatingFlagsOfTypes(typeSet));
                type.types = typeSet;
            }
            return type;
        }
        function getTypeFromIntersectionTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = getIntersectionType(ts.map(node.types, getTypeFromTypeNode));
            }
            return links.resolvedType;
        }
        function getTypeFromTypeLiteralOrFunctionOrConstructorTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                // Deferred resolution of members is handled by resolveObjectTypeMembers
                links.resolvedType = createObjectType(65536 /* Anonymous */, node.symbol);
            }
            return links.resolvedType;
        }
        function getStringLiteralTypeForText(text) {
            if (ts.hasProperty(stringLiteralTypes, text)) {
                return stringLiteralTypes[text];
            }
            var type = stringLiteralTypes[text] = createType(256 /* StringLiteral */);
            type.text = text;
            return type;
        }
        function getTypeFromStringLiteralTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = getStringLiteralTypeForText(node.text);
            }
            return links.resolvedType;
        }
        function getTypeFromJSDocVariadicType(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                var type = getTypeFromTypeNode(node.type);
                links.resolvedType = type ? createArrayType(type) : unknownType;
            }
            return links.resolvedType;
        }
        function getTypeFromJSDocTupleType(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                var types = ts.map(node.types, getTypeFromTypeNode);
                links.resolvedType = createTupleType(types);
            }
            return links.resolvedType;
        }
        function getThisType(node) {
            var container = ts.getThisContainer(node, /*includeArrowFunctions*/ false);
            var parent = container && container.parent;
            if (parent && (ts.isClassLike(parent) || parent.kind === 218 /* InterfaceDeclaration */)) {
                if (!(container.flags & 64 /* Static */) &&
                    (container.kind !== 145 /* Constructor */ || ts.isNodeDescendentOf(node, container.body))) {
                    return getDeclaredTypeOfClassOrInterface(getSymbolOfNode(parent)).thisType;
                }
            }
            error(node, ts.Diagnostics.A_this_type_is_available_only_in_a_non_static_member_of_a_class_or_interface);
            return unknownType;
        }
        function getTypeFromThisTypeNode(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = getThisType(node);
            }
            return links.resolvedType;
        }
        function getTypeFromTypeNode(node) {
            switch (node.kind) {
                case 117 /* AnyKeyword */:
                case 253 /* JSDocAllType */:
                case 254 /* JSDocUnknownType */:
                    return anyType;
                case 130 /* StringKeyword */:
                    return stringType;
                case 128 /* NumberKeyword */:
                    return numberType;
                case 120 /* BooleanKeyword */:
                    return booleanType;
                case 131 /* SymbolKeyword */:
                    return esSymbolType;
                case 103 /* VoidKeyword */:
                    return voidType;
                case 162 /* ThisType */:
                    return getTypeFromThisTypeNode(node);
                case 163 /* StringLiteralType */:
                    return getTypeFromStringLiteralTypeNode(node);
                case 152 /* TypeReference */:
                case 262 /* JSDocTypeReference */:
                    return getTypeFromTypeReference(node);
                case 151 /* TypePredicate */:
                    return booleanType;
                case 191 /* ExpressionWithTypeArguments */:
                    return getTypeFromTypeReference(node);
                case 155 /* TypeQuery */:
                    return getTypeFromTypeQueryNode(node);
                case 157 /* ArrayType */:
                case 255 /* JSDocArrayType */:
                    return getTypeFromArrayTypeNode(node);
                case 158 /* TupleType */:
                    return getTypeFromTupleTypeNode(node);
                case 159 /* UnionType */:
                case 256 /* JSDocUnionType */:
                    return getTypeFromUnionTypeNode(node);
                case 160 /* IntersectionType */:
                    return getTypeFromIntersectionTypeNode(node);
                case 161 /* ParenthesizedType */:
                case 258 /* JSDocNullableType */:
                case 259 /* JSDocNonNullableType */:
                case 266 /* JSDocConstructorType */:
                case 267 /* JSDocThisType */:
                case 263 /* JSDocOptionalType */:
                    return getTypeFromTypeNode(node.type);
                case 153 /* FunctionType */:
                case 154 /* ConstructorType */:
                case 156 /* TypeLiteral */:
                case 264 /* JSDocFunctionType */:
                case 260 /* JSDocRecordType */:
                    return getTypeFromTypeLiteralOrFunctionOrConstructorTypeNode(node);
                // This function assumes that an identifier or qualified name is a type expression
                // Callers should first ensure this by calling isTypeNode
                case 69 /* Identifier */:
                case 136 /* QualifiedName */:
                    var symbol = getSymbolAtLocation(node);
                    return symbol && getDeclaredTypeOfSymbol(symbol);
                case 257 /* JSDocTupleType */:
                    return getTypeFromJSDocTupleType(node);
                case 265 /* JSDocVariadicType */:
                    return getTypeFromJSDocVariadicType(node);
                default:
                    return unknownType;
            }
        }
        function instantiateList(items, mapper, instantiator) {
            if (items && items.length) {
                var result = [];
                for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
                    var v = items_1[_i];
                    result.push(instantiator(v, mapper));
                }
                return result;
            }
            return items;
        }
        function createUnaryTypeMapper(source, target) {
            return function (t) { return t === source ? target : t; };
        }
        function createBinaryTypeMapper(source1, target1, source2, target2) {
            return function (t) { return t === source1 ? target1 : t === source2 ? target2 : t; };
        }
        function createTypeMapper(sources, targets) {
            switch (sources.length) {
                case 1: return createUnaryTypeMapper(sources[0], targets[0]);
                case 2: return createBinaryTypeMapper(sources[0], targets[0], sources[1], targets[1]);
            }
            return function (t) {
                for (var i = 0; i < sources.length; i++) {
                    if (t === sources[i]) {
                        return targets[i];
                    }
                }
                return t;
            };
        }
        function createUnaryTypeEraser(source) {
            return function (t) { return t === source ? anyType : t; };
        }
        function createBinaryTypeEraser(source1, source2) {
            return function (t) { return t === source1 || t === source2 ? anyType : t; };
        }
        function createTypeEraser(sources) {
            switch (sources.length) {
                case 1: return createUnaryTypeEraser(sources[0]);
                case 2: return createBinaryTypeEraser(sources[0], sources[1]);
            }
            return function (t) {
                for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
                    var source = sources_1[_i];
                    if (t === source) {
                        return anyType;
                    }
                }
                return t;
            };
        }
        function getInferenceMapper(context) {
            if (!context.mapper) {
                var mapper = function (t) {
                    var typeParameters = context.typeParameters;
                    for (var i = 0; i < typeParameters.length; i++) {
                        if (t === typeParameters[i]) {
                            context.inferences[i].isFixed = true;
                            return getInferredType(context, i);
                        }
                    }
                    return t;
                };
                mapper.context = context;
                context.mapper = mapper;
            }
            return context.mapper;
        }
        function identityMapper(type) {
            return type;
        }
        function combineTypeMappers(mapper1, mapper2) {
            return function (t) { return instantiateType(mapper1(t), mapper2); };
        }
        function cloneTypeParameter(typeParameter) {
            var result = createType(512 /* TypeParameter */);
            result.symbol = typeParameter.symbol;
            result.target = typeParameter;
            return result;
        }
        function cloneTypePredicate(predicate, mapper) {
            if (ts.isIdentifierTypePredicate(predicate)) {
                return {
                    kind: 1 /* Identifier */,
                    parameterName: predicate.parameterName,
                    parameterIndex: predicate.parameterIndex,
                    type: instantiateType(predicate.type, mapper)
                };
            }
            else {
                return {
                    kind: 0 /* This */,
                    type: instantiateType(predicate.type, mapper)
                };
            }
        }
        function instantiateSignature(signature, mapper, eraseTypeParameters) {
            var freshTypeParameters;
            var freshTypePredicate;
            if (signature.typeParameters && !eraseTypeParameters) {
                // First create a fresh set of type parameters, then include a mapping from the old to the
                // new type parameters in the mapper function. Finally store this mapper in the new type
                // parameters such that we can use it when instantiating constraints.
                freshTypeParameters = ts.map(signature.typeParameters, cloneTypeParameter);
                mapper = combineTypeMappers(createTypeMapper(signature.typeParameters, freshTypeParameters), mapper);
                for (var _i = 0, freshTypeParameters_1 = freshTypeParameters; _i < freshTypeParameters_1.length; _i++) {
                    var tp = freshTypeParameters_1[_i];
                    tp.mapper = mapper;
                }
            }
            if (signature.typePredicate) {
                freshTypePredicate = cloneTypePredicate(signature.typePredicate, mapper);
            }
            var result = createSignature(signature.declaration, freshTypeParameters, instantiateList(signature.parameters, mapper, instantiateSymbol), instantiateType(signature.resolvedReturnType, mapper), freshTypePredicate, signature.minArgumentCount, signature.hasRestParameter, signature.hasStringLiterals);
            result.target = signature;
            result.mapper = mapper;
            return result;
        }
        function instantiateSymbol(symbol, mapper) {
            if (symbol.flags & 16777216 /* Instantiated */) {
                var links = getSymbolLinks(symbol);
                // If symbol being instantiated is itself a instantiation, fetch the original target and combine the
                // type mappers. This ensures that original type identities are properly preserved and that aliases
                // always reference a non-aliases.
                symbol = links.target;
                mapper = combineTypeMappers(links.mapper, mapper);
            }
            // Keep the flags from the symbol we're instantiating.  Mark that is instantiated, and
            // also transient so that we can just store data on it directly.
            var result = createSymbol(16777216 /* Instantiated */ | 67108864 /* Transient */ | symbol.flags, symbol.name);
            result.declarations = symbol.declarations;
            result.parent = symbol.parent;
            result.target = symbol;
            result.mapper = mapper;
            if (symbol.valueDeclaration) {
                result.valueDeclaration = symbol.valueDeclaration;
            }
            return result;
        }
        function instantiateAnonymousType(type, mapper) {
            if (mapper.instantiations) {
                var cachedType = mapper.instantiations[type.id];
                if (cachedType) {
                    return cachedType;
                }
            }
            else {
                mapper.instantiations = [];
            }
            // Mark the anonymous type as instantiated such that our infinite instantiation detection logic can recognize it
            var result = createObjectType(65536 /* Anonymous */ | 131072 /* Instantiated */, type.symbol);
            result.target = type;
            result.mapper = mapper;
            mapper.instantiations[type.id] = result;
            return result;
        }
        function instantiateType(type, mapper) {
            if (type && mapper !== identityMapper) {
                if (type.flags & 512 /* TypeParameter */) {
                    return mapper(type);
                }
                if (type.flags & 65536 /* Anonymous */) {
                    return type.symbol && type.symbol.flags & (16 /* Function */ | 8192 /* Method */ | 32 /* Class */ | 2048 /* TypeLiteral */ | 4096 /* ObjectLiteral */) ?
                        instantiateAnonymousType(type, mapper) : type;
                }
                if (type.flags & 4096 /* Reference */) {
                    return createTypeReference(type.target, instantiateList(type.typeArguments, mapper, instantiateType));
                }
                if (type.flags & 8192 /* Tuple */) {
                    return createTupleType(instantiateList(type.elementTypes, mapper, instantiateType));
                }
                if (type.flags & 16384 /* Union */) {
                    return getUnionType(instantiateList(type.types, mapper, instantiateType), /*noSubtypeReduction*/ true);
                }
                if (type.flags & 32768 /* Intersection */) {
                    return getIntersectionType(instantiateList(type.types, mapper, instantiateType));
                }
            }
            return type;
        }
        // Returns true if the given expression contains (at any level of nesting) a function or arrow expression
        // that is subject to contextual typing.
        function isContextSensitive(node) {
            ts.Debug.assert(node.kind !== 144 /* MethodDeclaration */ || ts.isObjectLiteralMethod(node));
            switch (node.kind) {
                case 176 /* FunctionExpression */:
                case 177 /* ArrowFunction */:
                    return isContextSensitiveFunctionLikeDeclaration(node);
                case 168 /* ObjectLiteralExpression */:
                    return ts.forEach(node.properties, isContextSensitive);
                case 167 /* ArrayLiteralExpression */:
                    return ts.forEach(node.elements, isContextSensitive);
                case 185 /* ConditionalExpression */:
                    return isContextSensitive(node.whenTrue) ||
                        isContextSensitive(node.whenFalse);
                case 184 /* BinaryExpression */:
                    return node.operatorToken.kind === 52 /* BarBarToken */ &&
                        (isContextSensitive(node.left) || isContextSensitive(node.right));
                case 248 /* PropertyAssignment */:
                    return isContextSensitive(node.initializer);
                case 144 /* MethodDeclaration */:
                case 143 /* MethodSignature */:
                    return isContextSensitiveFunctionLikeDeclaration(node);
                case 175 /* ParenthesizedExpression */:
                    return isContextSensitive(node.expression);
            }
            return false;
        }
        function isContextSensitiveFunctionLikeDeclaration(node) {
            return !node.typeParameters && node.parameters.length && !ts.forEach(node.parameters, function (p) { return p.type; });
        }
        function getTypeWithoutSignatures(type) {
            if (type.flags & 80896 /* ObjectType */) {
                var resolved = resolveStructuredTypeMembers(type);
                if (resolved.constructSignatures.length) {
                    var result = createObjectType(65536 /* Anonymous */, type.symbol);
                    result.members = resolved.members;
                    result.properties = resolved.properties;
                    result.callSignatures = emptyArray;
                    result.constructSignatures = emptyArray;
                    type = result;
                }
            }
            return type;
        }
        // TYPE CHECKING
        function isTypeIdenticalTo(source, target) {
            return checkTypeRelatedTo(source, target, identityRelation, /*errorNode*/ undefined);
        }
        function compareTypesIdentical(source, target) {
            return checkTypeRelatedTo(source, target, identityRelation, /*errorNode*/ undefined) ? -1 /* True */ : 0 /* False */;
        }
        function compareTypesAssignable(source, target) {
            return checkTypeRelatedTo(source, target, assignableRelation, /*errorNode*/ undefined) ? -1 /* True */ : 0 /* False */;
        }
        function isTypeSubtypeOf(source, target) {
            return checkTypeSubtypeOf(source, target, /*errorNode*/ undefined);
        }
        function isTypeAssignableTo(source, target) {
            return checkTypeAssignableTo(source, target, /*errorNode*/ undefined);
        }
        function checkTypeSubtypeOf(source, target, errorNode, headMessage, containingMessageChain) {
            return checkTypeRelatedTo(source, target, subtypeRelation, errorNode, headMessage, containingMessageChain);
        }
        function checkTypeAssignableTo(source, target, errorNode, headMessage, containingMessageChain) {
            return checkTypeRelatedTo(source, target, assignableRelation, errorNode, headMessage, containingMessageChain);
        }
        function isSignatureAssignableTo(source, target, ignoreReturnTypes) {
            return compareSignaturesRelated(source, target, ignoreReturnTypes, /*reportErrors*/ false, /*errorReporter*/ undefined, compareTypesAssignable) !== 0 /* False */;
        }
        /**
         * See signatureRelatedTo, compareSignaturesIdentical
         */
        function compareSignaturesRelated(source, target, ignoreReturnTypes, reportErrors, errorReporter, compareTypes) {
            // TODO (drosen): De-duplicate code between related functions.
            if (source === target) {
                return -1 /* True */;
            }
            if (!target.hasRestParameter && source.minArgumentCount > target.parameters.length) {
                return 0 /* False */;
            }
            // Spec 1.0 Section 3.8.3 & 3.8.4:
            // M and N (the signatures) are instantiated using type Any as the type argument for all type parameters declared by M and N
            source = getErasedSignature(source);
            target = getErasedSignature(target);
            var result = -1 /* True */;
            var sourceMax = getNumNonRestParameters(source);
            var targetMax = getNumNonRestParameters(target);
            var checkCount = getNumParametersToCheckForSignatureRelatability(source, sourceMax, target, targetMax);
            var sourceParams = source.parameters;
            var targetParams = target.parameters;
            for (var i = 0; i < checkCount; i++) {
                var s = i < sourceMax ? getTypeOfSymbol(sourceParams[i]) : getRestTypeOfSignature(source);
                var t = i < targetMax ? getTypeOfSymbol(targetParams[i]) : getRestTypeOfSignature(target);
                var related = compareTypes(t, s, /*reportErrors*/ false) || compareTypes(s, t, reportErrors);
                if (!related) {
                    if (reportErrors) {
                        errorReporter(ts.Diagnostics.Types_of_parameters_0_and_1_are_incompatible, sourceParams[i < sourceMax ? i : sourceMax].name, targetParams[i < targetMax ? i : targetMax].name);
                    }
                    return 0 /* False */;
                }
                result &= related;
            }
            if (!ignoreReturnTypes) {
                var targetReturnType = getReturnTypeOfSignature(target);
                if (targetReturnType === voidType) {
                    return result;
                }
                var sourceReturnType = getReturnTypeOfSignature(source);
                // The following block preserves behavior forbidding boolean returning functions from being assignable to type guard returning functions
                if (target.typePredicate) {
                    if (source.typePredicate) {
                        result &= compareTypePredicateRelatedTo(source.typePredicate, target.typePredicate, reportErrors, errorReporter, compareTypes);
                    }
                    else if (ts.isIdentifierTypePredicate(target.typePredicate)) {
                        if (reportErrors) {
                            errorReporter(ts.Diagnostics.Signature_0_must_have_a_type_predicate, signatureToString(source));
                        }
                        return 0 /* False */;
                    }
                }
                else {
                    result &= compareTypes(sourceReturnType, targetReturnType, reportErrors);
                }
            }
            return result;
        }
        function compareTypePredicateRelatedTo(source, target, reportErrors, errorReporter, compareTypes) {
            if (source.kind !== target.kind) {
                if (reportErrors) {
                    errorReporter(ts.Diagnostics.A_this_based_type_guard_is_not_compatible_with_a_parameter_based_type_guard);
                    errorReporter(ts.Diagnostics.Type_predicate_0_is_not_assignable_to_1, typePredicateToString(source), typePredicateToString(target));
                }
                return 0 /* False */;
            }
            if (source.kind === 1 /* Identifier */) {
                var sourceIdentifierPredicate = source;
                var targetIdentifierPredicate = target;
                if (sourceIdentifierPredicate.parameterIndex !== targetIdentifierPredicate.parameterIndex) {
                    if (reportErrors) {
                        errorReporter(ts.Diagnostics.Parameter_0_is_not_in_the_same_position_as_parameter_1, sourceIdentifierPredicate.parameterName, targetIdentifierPredicate.parameterName);
                        errorReporter(ts.Diagnostics.Type_predicate_0_is_not_assignable_to_1, typePredicateToString(source), typePredicateToString(target));
                    }
                    return 0 /* False */;
                }
            }
            var related = compareTypes(source.type, target.type, reportErrors);
            if (related === 0 /* False */ && reportErrors) {
                errorReporter(ts.Diagnostics.Type_predicate_0_is_not_assignable_to_1, typePredicateToString(source), typePredicateToString(target));
            }
            return related;
        }
        function isImplementationCompatibleWithOverload(implementation, overload) {
            var erasedSource = getErasedSignature(implementation);
            var erasedTarget = getErasedSignature(overload);
            // First see if the return types are compatible in either direction.
            var sourceReturnType = getReturnTypeOfSignature(erasedSource);
            var targetReturnType = getReturnTypeOfSignature(erasedTarget);
            if (targetReturnType === voidType
                || checkTypeRelatedTo(targetReturnType, sourceReturnType, assignableRelation, /*errorNode*/ undefined)
                || checkTypeRelatedTo(sourceReturnType, targetReturnType, assignableRelation, /*errorNode*/ undefined)) {
                return isSignatureAssignableTo(erasedSource, erasedTarget, /*ignoreReturnTypes*/ true);
            }
            return false;
        }
        function getNumNonRestParameters(signature) {
            var numParams = signature.parameters.length;
            return signature.hasRestParameter ?
                numParams - 1 :
                numParams;
        }
        function getNumParametersToCheckForSignatureRelatability(source, sourceNonRestParamCount, target, targetNonRestParamCount) {
            if (source.hasRestParameter === target.hasRestParameter) {
                if (source.hasRestParameter) {
                    // If both have rest parameters, get the max and add 1 to
                    // compensate for the rest parameter.
                    return Math.max(sourceNonRestParamCount, targetNonRestParamCount) + 1;
                }
                else {
                    return Math.min(sourceNonRestParamCount, targetNonRestParamCount);
                }
            }
            else {
                // Return the count for whichever signature doesn't have rest parameters.
                return source.hasRestParameter ?
                    targetNonRestParamCount :
                    sourceNonRestParamCount;
            }
        }
        /**
         * Checks if 'source' is related to 'target' (e.g.: is a assignable to).
         * @param source The left-hand-side of the relation.
         * @param target The right-hand-side of the relation.
         * @param relation The relation considered. One of 'identityRelation', 'assignableRelation', or 'subTypeRelation'.
         * Used as both to determine which checks are performed and as a cache of previously computed results.
         * @param errorNode The suggested node upon which all errors will be reported, if defined. This may or may not be the actual node used.
         * @param headMessage If the error chain should be prepended by a head message, then headMessage will be used.
         * @param containingMessageChain A chain of errors to prepend any new errors found.
         */
        function checkTypeRelatedTo(source, target, relation, errorNode, headMessage, containingMessageChain) {
            var errorInfo;
            var sourceStack;
            var targetStack;
            var maybeStack;
            var expandingFlags;
            var depth = 0;
            var overflow = false;
            ts.Debug.assert(relation !== identityRelation || !errorNode, "no error reporting in identity checking");
            var result = isRelatedTo(source, target, /*reportErrors*/ !!errorNode, headMessage);
            if (overflow) {
                error(errorNode, ts.Diagnostics.Excessive_stack_depth_comparing_types_0_and_1, typeToString(source), typeToString(target));
            }
            else if (errorInfo) {
                if (containingMessageChain) {
                    errorInfo = ts.concatenateDiagnosticMessageChains(containingMessageChain, errorInfo);
                }
                diagnostics.add(ts.createDiagnosticForNodeFromMessageChain(errorNode, errorInfo));
            }
            return result !== 0 /* False */;
            function reportError(message, arg0, arg1, arg2) {
                ts.Debug.assert(!!errorNode);
                errorInfo = ts.chainDiagnosticMessages(errorInfo, message, arg0, arg1, arg2);
            }
            function reportRelationError(message, source, target) {
                var sourceType = typeToString(source);
                var targetType = typeToString(target);
                if (sourceType === targetType) {
                    sourceType = typeToString(source, /*enclosingDeclaration*/ undefined, 128 /* UseFullyQualifiedType */);
                    targetType = typeToString(target, /*enclosingDeclaration*/ undefined, 128 /* UseFullyQualifiedType */);
                }
                reportError(message || ts.Diagnostics.Type_0_is_not_assignable_to_type_1, sourceType, targetType);
            }
            // Compare two types and return
            // Ternary.True if they are related with no assumptions,
            // Ternary.Maybe if they are related with assumptions of other relationships, or
            // Ternary.False if they are not related.
            function isRelatedTo(source, target, reportErrors, headMessage) {
                var result;
                // both types are the same - covers 'they are the same primitive type or both are Any' or the same type parameter cases
                if (source === target)
                    return -1 /* True */;
                if (relation === identityRelation) {
                    return isIdenticalTo(source, target);
                }
                if (isTypeAny(target))
                    return -1 /* True */;
                if (source === undefinedType)
                    return -1 /* True */;
                if (source === nullType && target !== undefinedType)
                    return -1 /* True */;
                if (source.flags & 128 /* Enum */ && target === numberType)
                    return -1 /* True */;
                if (source.flags & 128 /* Enum */ && target.flags & 128 /* Enum */) {
                    if (result = enumRelatedTo(source, target)) {
                        return result;
                    }
                }
                if (source.flags & 256 /* StringLiteral */ && target === stringType)
                    return -1 /* True */;
                if (relation === assignableRelation) {
                    if (isTypeAny(source))
                        return -1 /* True */;
                    if (source === numberType && target.flags & 128 /* Enum */)
                        return -1 /* True */;
                }
                if (source.flags & 8 /* Boolean */ && target.flags & 8 /* Boolean */) {
                    return -1 /* True */;
                }
                if (source.flags & 1048576 /* FreshObjectLiteral */) {
                    if (hasExcessProperties(source, target, reportErrors)) {
                        if (reportErrors) {
                            reportRelationError(headMessage, source, target);
                        }
                        return 0 /* False */;
                    }
                    // Above we check for excess properties with respect to the entire target type. When union
                    // and intersection types are further deconstructed on the target side, we don't want to
                    // make the check again (as it might fail for a partial target type). Therefore we obtain
                    // the regular source type and proceed with that.
                    if (target.flags & 49152 /* UnionOrIntersection */) {
                        source = getRegularTypeOfObjectLiteral(source);
                    }
                }
                var saveErrorInfo = errorInfo;
                // Note that the "each" checks must precede the "some" checks to produce the correct results
                if (source.flags & 16384 /* Union */) {
                    if (result = eachTypeRelatedToType(source, target, reportErrors)) {
                        return result;
                    }
                }
                else if (target.flags & 32768 /* Intersection */) {
                    if (result = typeRelatedToEachType(source, target, reportErrors)) {
                        return result;
                    }
                }
                else {
                    // It is necessary to try "some" checks on both sides because there may be nested "each" checks
                    // on either side that need to be prioritized. For example, A | B = (A | B) & (C | D) or
                    // A & B = (A & B) | (C & D).
                    if (source.flags & 32768 /* Intersection */) {
                        // If target is a union type the following check will report errors so we suppress them here
                        if (result = someTypeRelatedToType(source, target, reportErrors && !(target.flags & 16384 /* Union */))) {
                            return result;
                        }
                    }
                    if (target.flags & 16384 /* Union */) {
                        if (result = typeRelatedToSomeType(source, target, reportErrors)) {
                            return result;
                        }
                    }
                }
                if (source.flags & 512 /* TypeParameter */) {
                    var constraint = getConstraintOfTypeParameter(source);
                    if (!constraint || constraint.flags & 1 /* Any */) {
                        constraint = emptyObjectType;
                    }
                    // Report constraint errors only if the constraint is not the empty object type
                    var reportConstraintErrors = reportErrors && constraint !== emptyObjectType;
                    if (result = isRelatedTo(constraint, target, reportConstraintErrors)) {
                        errorInfo = saveErrorInfo;
                        return result;
                    }
                }
                else {
                    if (source.flags & 4096 /* Reference */ && target.flags & 4096 /* Reference */ && source.target === target.target) {
                        // We have type references to same target type, see if relationship holds for all type arguments
                        if (result = typeArgumentsRelatedTo(source, target, reportErrors)) {
                            return result;
                        }
                    }
                    // Even if relationship doesn't hold for unions, intersections, or generic type references,
                    // it may hold in a structural comparison.
                    var apparentSource = getApparentType(source);
                    // In a check of the form X = A & B, we will have previously checked if A relates to X or B relates
                    // to X. Failing both of those we want to check if the aggregation of A and B's members structurally
                    // relates to X. Thus, we include intersection types on the source side here.
                    if (apparentSource.flags & (80896 /* ObjectType */ | 32768 /* Intersection */) && target.flags & 80896 /* ObjectType */) {
                        // Report structural errors only if we haven't reported any errors yet
                        var reportStructuralErrors = reportErrors && errorInfo === saveErrorInfo && !(source.flags & 16777726 /* Primitive */);
                        if (result = objectTypeRelatedTo(apparentSource, source, target, reportStructuralErrors)) {
                            errorInfo = saveErrorInfo;
                            return result;
                        }
                    }
                }
                if (reportErrors) {
                    reportRelationError(headMessage, source, target);
                }
                return 0 /* False */;
            }
            function isIdenticalTo(source, target) {
                var result;
                if (source.flags & 80896 /* ObjectType */ && target.flags & 80896 /* ObjectType */) {
                    if (source.flags & 4096 /* Reference */ && target.flags & 4096 /* Reference */ && source.target === target.target) {
                        // We have type references to same target type, see if all type arguments are identical
                        if (result = typeArgumentsRelatedTo(source, target, /*reportErrors*/ false)) {
                            return result;
                        }
                    }
                    return objectTypeRelatedTo(source, source, target, /*reportErrors*/ false);
                }
                if (source.flags & 16384 /* Union */ && target.flags & 16384 /* Union */ ||
                    source.flags & 32768 /* Intersection */ && target.flags & 32768 /* Intersection */) {
                    if (result = eachTypeRelatedToSomeType(source, target)) {
                        if (result &= eachTypeRelatedToSomeType(target, source)) {
                            return result;
                        }
                    }
                }
                return 0 /* False */;
            }
            // Check if a property with the given name is known anywhere in the given type. In an object type, a property
            // is considered known if the object type is empty and the check is for assignability, if the object type has
            // index signatures, or if the property is actually declared in the object type. In a union or intersection
            // type, a property is considered known if it is known in any constituent type.
            function isKnownProperty(type, name) {
                if (type.flags & 80896 /* ObjectType */) {
                    var resolved = resolveStructuredTypeMembers(type);
                    if (relation === assignableRelation && (type === globalObjectType || resolved.properties.length === 0) ||
                        resolved.stringIndexType || resolved.numberIndexType || getPropertyOfType(type, name)) {
                        return true;
                    }
                }
                else if (type.flags & 49152 /* UnionOrIntersection */) {
                    for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                        var t = _a[_i];
                        if (isKnownProperty(t, name)) {
                            return true;
                        }
                    }
                }
                return false;
            }
            function hasExcessProperties(source, target, reportErrors) {
                if (!(target.flags & 67108864 /* ObjectLiteralPatternWithComputedProperties */) && someConstituentTypeHasKind(target, 80896 /* ObjectType */)) {
                    for (var _i = 0, _a = getPropertiesOfObjectType(source); _i < _a.length; _i++) {
                        var prop = _a[_i];
                        if (!isKnownProperty(target, prop.name)) {
                            if (reportErrors) {
                                // We know *exactly* where things went wrong when comparing the types.
                                // Use this property as the error node as this will be more helpful in
                                // reasoning about what went wrong.
                                ts.Debug.assert(!!errorNode);
                                errorNode = prop.valueDeclaration;
                                reportError(ts.Diagnostics.Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1, symbolToString(prop), typeToString(target));
                            }
                            return true;
                        }
                    }
                }
                return false;
            }
            function eachTypeRelatedToSomeType(source, target) {
                var result = -1 /* True */;
                var sourceTypes = source.types;
                for (var _i = 0, sourceTypes_1 = sourceTypes; _i < sourceTypes_1.length; _i++) {
                    var sourceType = sourceTypes_1[_i];
                    var related = typeRelatedToSomeType(sourceType, target, /*reportErrors*/ false);
                    if (!related) {
                        return 0 /* False */;
                    }
                    result &= related;
                }
                return result;
            }
            function typeRelatedToSomeType(source, target, reportErrors) {
                var targetTypes = target.types;
                for (var i = 0, len = targetTypes.length; i < len; i++) {
                    var related = isRelatedTo(source, targetTypes[i], reportErrors && i === len - 1);
                    if (related) {
                        return related;
                    }
                }
                return 0 /* False */;
            }
            function typeRelatedToEachType(source, target, reportErrors) {
                var result = -1 /* True */;
                var targetTypes = target.types;
                for (var _i = 0, targetTypes_1 = targetTypes; _i < targetTypes_1.length; _i++) {
                    var targetType = targetTypes_1[_i];
                    var related = isRelatedTo(source, targetType, reportErrors);
                    if (!related) {
                        return 0 /* False */;
                    }
                    result &= related;
                }
                return result;
            }
            function someTypeRelatedToType(source, target, reportErrors) {
                var sourceTypes = source.types;
                for (var i = 0, len = sourceTypes.length; i < len; i++) {
                    var related = isRelatedTo(sourceTypes[i], target, reportErrors && i === len - 1);
                    if (related) {
                        return related;
                    }
                }
                return 0 /* False */;
            }
            function eachTypeRelatedToType(source, target, reportErrors) {
                var result = -1 /* True */;
                var sourceTypes = source.types;
                for (var _i = 0, sourceTypes_2 = sourceTypes; _i < sourceTypes_2.length; _i++) {
                    var sourceType = sourceTypes_2[_i];
                    var related = isRelatedTo(sourceType, target, reportErrors);
                    if (!related) {
                        return 0 /* False */;
                    }
                    result &= related;
                }
                return result;
            }
            function typeArgumentsRelatedTo(source, target, reportErrors) {
                var sources = source.typeArguments || emptyArray;
                var targets = target.typeArguments || emptyArray;
                if (sources.length !== targets.length && relation === identityRelation) {
                    return 0 /* False */;
                }
                var length = sources.length <= targets.length ? sources.length : targets.length;
                var result = -1 /* True */;
                for (var i = 0; i < length; i++) {
                    var related = isRelatedTo(sources[i], targets[i], reportErrors);
                    if (!related) {
                        return 0 /* False */;
                    }
                    result &= related;
                }
                return result;
            }
            // Determine if two object types are related by structure. First, check if the result is already available in the global cache.
            // Second, check if we have already started a comparison of the given two types in which case we assume the result to be true.
            // Third, check if both types are part of deeply nested chains of generic type instantiations and if so assume the types are
            // equal and infinitely expanding. Fourth, if we have reached a depth of 100 nested comparisons, assume we have runaway recursion
            // and issue an error. Otherwise, actually compare the structure of the two types.
            function objectTypeRelatedTo(source, originalSource, target, reportErrors) {
                if (overflow) {
                    return 0 /* False */;
                }
                var id = relation !== identityRelation || source.id < target.id ? source.id + "," + target.id : target.id + "," + source.id;
                var related = relation[id];
                if (related !== undefined) {
                    if (reportErrors && related === 2 /* Failed */) {
                        // We are elaborating errors and the cached result is an unreported failure. Record the result as a reported
                        // failure and continue computing the relation such that errors get reported.
                        relation[id] = 3 /* FailedAndReported */;
                    }
                    else {
                        return related === 1 /* Succeeded */ ? -1 /* True */ : 0 /* False */;
                    }
                }
                if (depth > 0) {
                    for (var i = 0; i < depth; i++) {
                        // If source and target are already being compared, consider them related with assumptions
                        if (maybeStack[i][id]) {
                            return 1 /* Maybe */;
                        }
                    }
                    if (depth === 100) {
                        overflow = true;
                        return 0 /* False */;
                    }
                }
                else {
                    sourceStack = [];
                    targetStack = [];
                    maybeStack = [];
                    expandingFlags = 0;
                }
                sourceStack[depth] = source;
                targetStack[depth] = target;
                maybeStack[depth] = {};
                maybeStack[depth][id] = 1 /* Succeeded */;
                depth++;
                var saveExpandingFlags = expandingFlags;
                if (!(expandingFlags & 1) && isDeeplyNestedGeneric(source, sourceStack, depth))
                    expandingFlags |= 1;
                if (!(expandingFlags & 2) && isDeeplyNestedGeneric(target, targetStack, depth))
                    expandingFlags |= 2;
                var result;
                if (expandingFlags === 3) {
                    result = 1 /* Maybe */;
                }
                else {
                    result = propertiesRelatedTo(source, target, reportErrors);
                    if (result) {
                        result &= signaturesRelatedTo(source, target, 0 /* Call */, reportErrors);
                        if (result) {
                            result &= signaturesRelatedTo(source, target, 1 /* Construct */, reportErrors);
                            if (result) {
                                result &= stringIndexTypesRelatedTo(source, originalSource, target, reportErrors);
                                if (result) {
                                    result &= numberIndexTypesRelatedTo(source, originalSource, target, reportErrors);
                                }
                            }
                        }
                    }
                }
                expandingFlags = saveExpandingFlags;
                depth--;
                if (result) {
                    var maybeCache = maybeStack[depth];
                    // If result is definitely true, copy assumptions to global cache, else copy to next level up
                    var destinationCache = (result === -1 /* True */ || depth === 0) ? relation : maybeStack[depth - 1];
                    ts.copyMap(maybeCache, destinationCache);
                }
                else {
                    // A false result goes straight into global cache (when something is false under assumptions it
                    // will also be false without assumptions)
                    relation[id] = reportErrors ? 3 /* FailedAndReported */ : 2 /* Failed */;
                }
                return result;
            }
            function propertiesRelatedTo(source, target, reportErrors) {
                if (relation === identityRelation) {
                    return propertiesIdenticalTo(source, target);
                }
                var result = -1 /* True */;
                var properties = getPropertiesOfObjectType(target);
                var requireOptionalProperties = relation === subtypeRelation && !(source.flags & 524288 /* ObjectLiteral */);
                for (var _i = 0, properties_1 = properties; _i < properties_1.length; _i++) {
                    var targetProp = properties_1[_i];
                    var sourceProp = getPropertyOfType(source, targetProp.name);
                    if (sourceProp !== targetProp) {
                        if (!sourceProp) {
                            if (!(targetProp.flags & 536870912 /* Optional */) || requireOptionalProperties) {
                                if (reportErrors) {
                                    reportError(ts.Diagnostics.Property_0_is_missing_in_type_1, symbolToString(targetProp), typeToString(source));
                                }
                                return 0 /* False */;
                            }
                        }
                        else if (!(targetProp.flags & 134217728 /* Prototype */)) {
                            var sourcePropFlags = getDeclarationFlagsFromSymbol(sourceProp);
                            var targetPropFlags = getDeclarationFlagsFromSymbol(targetProp);
                            if (sourcePropFlags & 16 /* Private */ || targetPropFlags & 16 /* Private */) {
                                if (sourceProp.valueDeclaration !== targetProp.valueDeclaration) {
                                    if (reportErrors) {
                                        if (sourcePropFlags & 16 /* Private */ && targetPropFlags & 16 /* Private */) {
                                            reportError(ts.Diagnostics.Types_have_separate_declarations_of_a_private_property_0, symbolToString(targetProp));
                                        }
                                        else {
                                            reportError(ts.Diagnostics.Property_0_is_private_in_type_1_but_not_in_type_2, symbolToString(targetProp), typeToString(sourcePropFlags & 16 /* Private */ ? source : target), typeToString(sourcePropFlags & 16 /* Private */ ? target : source));
                                        }
                                    }
                                    return 0 /* False */;
                                }
                            }
                            else if (targetPropFlags & 32 /* Protected */) {
                                var sourceDeclaredInClass = sourceProp.parent && sourceProp.parent.flags & 32 /* Class */;
                                var sourceClass = sourceDeclaredInClass ? getDeclaredTypeOfSymbol(getParentOfSymbol(sourceProp)) : undefined;
                                var targetClass = getDeclaredTypeOfSymbol(getParentOfSymbol(targetProp));
                                if (!sourceClass || !hasBaseType(sourceClass, targetClass)) {
                                    if (reportErrors) {
                                        reportError(ts.Diagnostics.Property_0_is_protected_but_type_1_is_not_a_class_derived_from_2, symbolToString(targetProp), typeToString(sourceClass || source), typeToString(targetClass));
                                    }
                                    return 0 /* False */;
                                }
                            }
                            else if (sourcePropFlags & 32 /* Protected */) {
                                if (reportErrors) {
                                    reportError(ts.Diagnostics.Property_0_is_protected_in_type_1_but_public_in_type_2, symbolToString(targetProp), typeToString(source), typeToString(target));
                                }
                                return 0 /* False */;
                            }
                            var related = isRelatedTo(getTypeOfSymbol(sourceProp), getTypeOfSymbol(targetProp), reportErrors);
                            if (!related) {
                                if (reportErrors) {
                                    reportError(ts.Diagnostics.Types_of_property_0_are_incompatible, symbolToString(targetProp));
                                }
                                return 0 /* False */;
                            }
                            result &= related;
                            if (sourceProp.flags & 536870912 /* Optional */ && !(targetProp.flags & 536870912 /* Optional */)) {
                                // TypeScript 1.0 spec (April 2014): 3.8.3
                                // S is a subtype of a type T, and T is a supertype of S if ...
                                // S' and T are object types and, for each member M in T..
                                // M is a property and S' contains a property N where
                                // if M is a required property, N is also a required property
                                // (M - property in T)
                                // (N - property in S)
                                if (reportErrors) {
                                    reportError(ts.Diagnostics.Property_0_is_optional_in_type_1_but_required_in_type_2, symbolToString(targetProp), typeToString(source), typeToString(target));
                                }
                                return 0 /* False */;
                            }
                        }
                    }
                }
                return result;
            }
            function propertiesIdenticalTo(source, target) {
                if (!(source.flags & 80896 /* ObjectType */ && target.flags & 80896 /* ObjectType */)) {
                    return 0 /* False */;
                }
                var sourceProperties = getPropertiesOfObjectType(source);
                var targetProperties = getPropertiesOfObjectType(target);
                if (sourceProperties.length !== targetProperties.length) {
                    return 0 /* False */;
                }
                var result = -1 /* True */;
                for (var _i = 0, sourceProperties_1 = sourceProperties; _i < sourceProperties_1.length; _i++) {
                    var sourceProp = sourceProperties_1[_i];
                    var targetProp = getPropertyOfObjectType(target, sourceProp.name);
                    if (!targetProp) {
                        return 0 /* False */;
                    }
                    var related = compareProperties(sourceProp, targetProp, isRelatedTo);
                    if (!related) {
                        return 0 /* False */;
                    }
                    result &= related;
                }
                return result;
            }
            function signaturesRelatedTo(source, target, kind, reportErrors) {
                if (relation === identityRelation) {
                    return signaturesIdenticalTo(source, target, kind);
                }
                if (target === anyFunctionType || source === anyFunctionType) {
                    return -1 /* True */;
                }
                var sourceSignatures = getSignaturesOfType(source, kind);
                var targetSignatures = getSignaturesOfType(target, kind);
                if (kind === 1 /* Construct */ && sourceSignatures.length && targetSignatures.length &&
                    isAbstractConstructorType(source) && !isAbstractConstructorType(target)) {
                    // An abstract constructor type is not assignable to a non-abstract constructor type
                    // as it would otherwise be possible to new an abstract class. Note that the assignablity
                    // check we perform for an extends clause excludes construct signatures from the target,
                    // so this check never proceeds.
                    if (reportErrors) {
                        reportError(ts.Diagnostics.Cannot_assign_an_abstract_constructor_type_to_a_non_abstract_constructor_type);
                    }
                    return 0 /* False */;
                }
                var result = -1 /* True */;
                var saveErrorInfo = errorInfo;
                outer: for (var _i = 0, targetSignatures_1 = targetSignatures; _i < targetSignatures_1.length; _i++) {
                    var t = targetSignatures_1[_i];
                    if (!t.hasStringLiterals || target.flags & 262144 /* FromSignature */) {
                        // Only elaborate errors from the first failure
                        var shouldElaborateErrors = reportErrors;
                        for (var _a = 0, sourceSignatures_1 = sourceSignatures; _a < sourceSignatures_1.length; _a++) {
                            var s = sourceSignatures_1[_a];
                            if (!s.hasStringLiterals || source.flags & 262144 /* FromSignature */) {
                                var related = signatureRelatedTo(s, t, shouldElaborateErrors);
                                if (related) {
                                    result &= related;
                                    errorInfo = saveErrorInfo;
                                    continue outer;
                                }
                                shouldElaborateErrors = false;
                            }
                        }
                        // don't elaborate the primitive apparent types (like Number)
                        // because the actual primitives will have already been reported.
                        if (shouldElaborateErrors) {
                            reportError(ts.Diagnostics.Type_0_provides_no_match_for_the_signature_1, typeToString(source), signatureToString(t, /*enclosingDeclaration*/ undefined, /*flags*/ undefined, kind));
                        }
                        return 0 /* False */;
                    }
                }
                return result;
            }
            /**
             * See signatureAssignableTo, compareSignaturesIdentical
             */
            function signatureRelatedTo(source, target, reportErrors) {
                return compareSignaturesRelated(source, target, /*ignoreReturnTypes*/ false, reportErrors, reportError, isRelatedTo);
            }
            function signaturesIdenticalTo(source, target, kind) {
                var sourceSignatures = getSignaturesOfType(source, kind);
                var targetSignatures = getSignaturesOfType(target, kind);
                if (sourceSignatures.length !== targetSignatures.length) {
                    return 0 /* False */;
                }
                var result = -1 /* True */;
                for (var i = 0, len = sourceSignatures.length; i < len; i++) {
                    var related = compareSignaturesIdentical(sourceSignatures[i], targetSignatures[i], /*partialMatch*/ false, /*ignoreReturnTypes*/ false, isRelatedTo);
                    if (!related) {
                        return 0 /* False */;
                    }
                    result &= related;
                }
                return result;
            }
            function stringIndexTypesRelatedTo(source, originalSource, target, reportErrors) {
                if (relation === identityRelation) {
                    return indexTypesIdenticalTo(0 /* String */, source, target);
                }
                var targetType = getIndexTypeOfType(target, 0 /* String */);
                if (targetType) {
                    if ((targetType.flags & 1 /* Any */) && !(originalSource.flags & 16777726 /* Primitive */)) {
                        // non-primitive assignment to any is always allowed, eg
                        //   `var x: { [index: string]: any } = { property: 12 };`
                        return -1 /* True */;
                    }
                    var sourceType = getIndexTypeOfType(source, 0 /* String */);
                    if (!sourceType) {
                        if (reportErrors) {
                            reportError(ts.Diagnostics.Index_signature_is_missing_in_type_0, typeToString(source));
                        }
                        return 0 /* False */;
                    }
                    var related = isRelatedTo(sourceType, targetType, reportErrors);
                    if (!related) {
                        if (reportErrors) {
                            reportError(ts.Diagnostics.Index_signatures_are_incompatible);
                        }
                        return 0 /* False */;
                    }
                    return related;
                }
                return -1 /* True */;
            }
            function numberIndexTypesRelatedTo(source, originalSource, target, reportErrors) {
                if (relation === identityRelation) {
                    return indexTypesIdenticalTo(1 /* Number */, source, target);
                }
                var targetType = getIndexTypeOfType(target, 1 /* Number */);
                if (targetType) {
                    if ((targetType.flags & 1 /* Any */) && !(originalSource.flags & 16777726 /* Primitive */)) {
                        // non-primitive assignment to any is always allowed, eg
                        //   `var x: { [index: number]: any } = { property: 12 };`
                        return -1 /* True */;
                    }
                    var sourceStringType = getIndexTypeOfType(source, 0 /* String */);
                    var sourceNumberType = getIndexTypeOfType(source, 1 /* Number */);
                    if (!(sourceStringType || sourceNumberType)) {
                        if (reportErrors) {
                            reportError(ts.Diagnostics.Index_signature_is_missing_in_type_0, typeToString(source));
                        }
                        return 0 /* False */;
                    }
                    var related = void 0;
                    if (sourceStringType && sourceNumberType) {
                        // If we know for sure we're testing both string and numeric index types then only report errors from the second one
                        related = isRelatedTo(sourceStringType, targetType, /*reportErrors*/ false) || isRelatedTo(sourceNumberType, targetType, reportErrors);
                    }
                    else {
                        related = isRelatedTo(sourceStringType || sourceNumberType, targetType, reportErrors);
                    }
                    if (!related) {
                        if (reportErrors) {
                            reportError(ts.Diagnostics.Index_signatures_are_incompatible);
                        }
                        return 0 /* False */;
                    }
                    return related;
                }
                return -1 /* True */;
            }
            function indexTypesIdenticalTo(indexKind, source, target) {
                var targetType = getIndexTypeOfType(target, indexKind);
                var sourceType = getIndexTypeOfType(source, indexKind);
                if (!sourceType && !targetType) {
                    return -1 /* True */;
                }
                if (sourceType && targetType) {
                    return isRelatedTo(sourceType, targetType);
                }
                return 0 /* False */;
            }
            function enumRelatedTo(source, target) {
                if (source.symbol.name !== target.symbol.name ||
                    source.symbol.flags & 128 /* ConstEnum */ ||
                    target.symbol.flags & 128 /* ConstEnum */) {
                    return 0 /* False */;
                }
                var targetEnumType = getTypeOfSymbol(target.symbol);
                for (var _i = 0, _a = getPropertiesOfType(getTypeOfSymbol(source.symbol)); _i < _a.length; _i++) {
                    var property = _a[_i];
                    if (property.flags & 8 /* EnumMember */) {
                        var targetProperty = getPropertyOfType(targetEnumType, property.name);
                        if (!targetProperty || !(targetProperty.flags & 8 /* EnumMember */)) {
                            reportError(ts.Diagnostics.Property_0_is_missing_in_type_1, property.name, typeToString(target, /*enclosingDeclaration*/ undefined, 128 /* UseFullyQualifiedType */));
                            return 0 /* False */;
                        }
                    }
                }
                return -1 /* True */;
            }
        }
        // Return true if the given type is the constructor type for an abstract class
        function isAbstractConstructorType(type) {
            if (type.flags & 65536 /* Anonymous */) {
                var symbol = type.symbol;
                if (symbol && symbol.flags & 32 /* Class */) {
                    var declaration = getClassLikeDeclarationOfSymbol(symbol);
                    if (declaration && declaration.flags & 128 /* Abstract */) {
                        return true;
                    }
                }
            }
            return false;
        }
        // Return true if the given type is part of a deeply nested chain of generic instantiations. We consider this to be the case
        // when structural type comparisons have been started for 10 or more instantiations of the same generic type. It is possible,
        // though highly unlikely, for this test to be true in a situation where a chain of instantiations is not infinitely expanding.
        // Effectively, we will generate a false positive when two types are structurally equal to at least 10 levels, but unequal at
        // some level beyond that.
        function isDeeplyNestedGeneric(type, stack, depth) {
            // We track type references (created by createTypeReference) and instantiated types (created by instantiateType)
            if (type.flags & (4096 /* Reference */ | 131072 /* Instantiated */) && depth >= 5) {
                var symbol = type.symbol;
                var count = 0;
                for (var i = 0; i < depth; i++) {
                    var t = stack[i];
                    if (t.flags & (4096 /* Reference */ | 131072 /* Instantiated */) && t.symbol === symbol) {
                        count++;
                        if (count >= 5)
                            return true;
                    }
                }
            }
            return false;
        }
        function isPropertyIdenticalTo(sourceProp, targetProp) {
            return compareProperties(sourceProp, targetProp, compareTypesIdentical) !== 0 /* False */;
        }
        function compareProperties(sourceProp, targetProp, compareTypes) {
            // Two members are considered identical when
            // - they are public properties with identical names, optionality, and types,
            // - they are private or protected properties originating in the same declaration and having identical types
            if (sourceProp === targetProp) {
                return -1 /* True */;
            }
            var sourcePropAccessibility = getDeclarationFlagsFromSymbol(sourceProp) & (16 /* Private */ | 32 /* Protected */);
            var targetPropAccessibility = getDeclarationFlagsFromSymbol(targetProp) & (16 /* Private */ | 32 /* Protected */);
            if (sourcePropAccessibility !== targetPropAccessibility) {
                return 0 /* False */;
            }
            if (sourcePropAccessibility) {
                if (getTargetSymbol(sourceProp) !== getTargetSymbol(targetProp)) {
                    return 0 /* False */;
                }
            }
            else {
                if ((sourceProp.flags & 536870912 /* Optional */) !== (targetProp.flags & 536870912 /* Optional */)) {
                    return 0 /* False */;
                }
            }
            return compareTypes(getTypeOfSymbol(sourceProp), getTypeOfSymbol(targetProp));
        }
        function isMatchingSignature(source, target, partialMatch) {
            // A source signature matches a target signature if the two signatures have the same number of required,
            // optional, and rest parameters.
            if (source.parameters.length === target.parameters.length &&
                source.minArgumentCount === target.minArgumentCount &&
                source.hasRestParameter === target.hasRestParameter) {
                return true;
            }
            // A source signature partially matches a target signature if the target signature has no fewer required
            // parameters and no more overall parameters than the source signature (where a signature with a rest
            // parameter is always considered to have more overall parameters than one without).
            if (partialMatch && source.minArgumentCount <= target.minArgumentCount && (source.hasRestParameter && !target.hasRestParameter ||
                source.hasRestParameter === target.hasRestParameter && source.parameters.length >= target.parameters.length)) {
                return true;
            }
            return false;
        }
        /**
         * See signatureRelatedTo, compareSignaturesIdentical
         */
        function compareSignaturesIdentical(source, target, partialMatch, ignoreReturnTypes, compareTypes) {
            // TODO (drosen): De-duplicate code between related functions.
            if (source === target) {
                return -1 /* True */;
            }
            if (!(isMatchingSignature(source, target, partialMatch))) {
                return 0 /* False */;
            }
            // Check that the two signatures have the same number of type parameters. We might consider
            // also checking that any type parameter constraints match, but that would require instantiating
            // the constraints with a common set of type arguments to get relatable entities in places where
            // type parameters occur in the constraints. The complexity of doing that doesn't seem worthwhile,
            // particularly as we're comparing erased versions of the signatures below.
            if ((source.typeParameters ? source.typeParameters.length : 0) !== (target.typeParameters ? target.typeParameters.length : 0)) {
                return 0 /* False */;
            }
            // Spec 1.0 Section 3.8.3 & 3.8.4:
            // M and N (the signatures) are instantiated using type Any as the type argument for all type parameters declared by M and N
            source = getErasedSignature(source);
            target = getErasedSignature(target);
            var result = -1 /* True */;
            var targetLen = target.parameters.length;
            for (var i = 0; i < targetLen; i++) {
                var s = isRestParameterIndex(source, i) ? getRestTypeOfSignature(source) : getTypeOfSymbol(source.parameters[i]);
                var t = isRestParameterIndex(target, i) ? getRestTypeOfSignature(target) : getTypeOfSymbol(target.parameters[i]);
                var related = compareTypes(s, t);
                if (!related) {
                    return 0 /* False */;
                }
                result &= related;
            }
            if (!ignoreReturnTypes) {
                result &= compareTypes(getReturnTypeOfSignature(source), getReturnTypeOfSignature(target));
            }
            return result;
        }
        function isRestParameterIndex(signature, parameterIndex) {
            return signature.hasRestParameter && parameterIndex >= signature.parameters.length - 1;
        }
        function isSupertypeOfEach(candidate, types) {
            for (var _i = 0, types_6 = types; _i < types_6.length; _i++) {
                var type = types_6[_i];
                if (candidate !== type && !isTypeSubtypeOf(type, candidate))
                    return false;
            }
            return true;
        }
        function getCommonSupertype(types) {
            return ts.forEach(types, function (t) { return isSupertypeOfEach(t, types) ? t : undefined; });
        }
        function reportNoCommonSupertypeError(types, errorLocation, errorMessageChainHead) {
            // The downfallType/bestSupertypeDownfallType is the first type that caused a particular candidate
            // to not be the common supertype. So if it weren't for this one downfallType (and possibly others),
            // the type in question could have been the common supertype.
            var bestSupertype;
            var bestSupertypeDownfallType;
            var bestSupertypeScore = 0;
            for (var i = 0; i < types.length; i++) {
                var score = 0;
                var downfallType = undefined;
                for (var j = 0; j < types.length; j++) {
                    if (isTypeSubtypeOf(types[j], types[i])) {
                        score++;
                    }
                    else if (!downfallType) {
                        downfallType = types[j];
                    }
                }
                ts.Debug.assert(!!downfallType, "If there is no common supertype, each type should have a downfallType");
                if (score > bestSupertypeScore) {
                    bestSupertype = types[i];
                    bestSupertypeDownfallType = downfallType;
                    bestSupertypeScore = score;
                }
                // types.length - 1 is the maximum score, given that getCommonSupertype returned false
                if (bestSupertypeScore === types.length - 1) {
                    break;
                }
            }
            // In the following errors, the {1} slot is before the {0} slot because checkTypeSubtypeOf supplies the
            // subtype as the first argument to the error
            checkTypeSubtypeOf(bestSupertypeDownfallType, bestSupertype, errorLocation, ts.Diagnostics.Type_argument_candidate_1_is_not_a_valid_type_argument_because_it_is_not_a_supertype_of_candidate_0, errorMessageChainHead);
        }
        function isArrayType(type) {
            return type.flags & 4096 /* Reference */ && type.target === globalArrayType;
        }
        function isArrayLikeType(type) {
            // A type is array-like if it is not the undefined or null type and if it is assignable to any[]
            return !(type.flags & (32 /* Undefined */ | 64 /* Null */)) && isTypeAssignableTo(type, anyArrayType);
        }
        function isTupleLikeType(type) {
            return !!getPropertyOfType(type, "0");
        }
        function isStringLiteralType(type) {
            return type.flags & 256 /* StringLiteral */;
        }
        /**
         * Check if a Type was written as a tuple type literal.
         * Prefer using isTupleLikeType() unless the use of `elementTypes` is required.
         */
        function isTupleType(type) {
            return !!(type.flags & 8192 /* Tuple */);
        }
        function getRegularTypeOfObjectLiteral(type) {
            if (type.flags & 1048576 /* FreshObjectLiteral */) {
                var regularType = type.regularType;
                if (!regularType) {
                    regularType = createType(type.flags & ~1048576 /* FreshObjectLiteral */);
                    regularType.symbol = type.symbol;
                    regularType.members = type.members;
                    regularType.properties = type.properties;
                    regularType.callSignatures = type.callSignatures;
                    regularType.constructSignatures = type.constructSignatures;
                    regularType.stringIndexType = type.stringIndexType;
                    regularType.numberIndexType = type.numberIndexType;
                    type.regularType = regularType;
                }
                return regularType;
            }
            return type;
        }
        function getWidenedTypeOfObjectLiteral(type) {
            var properties = getPropertiesOfObjectType(type);
            var members = {};
            ts.forEach(properties, function (p) {
                var propType = getTypeOfSymbol(p);
                var widenedType = getWidenedType(propType);
                if (propType !== widenedType) {
                    var symbol = createSymbol(p.flags | 67108864 /* Transient */, p.name);
                    symbol.declarations = p.declarations;
                    symbol.parent = p.parent;
                    symbol.type = widenedType;
                    symbol.target = p;
                    if (p.valueDeclaration)
                        symbol.valueDeclaration = p.valueDeclaration;
                    p = symbol;
                }
                members[p.name] = p;
            });
            var stringIndexType = getIndexTypeOfType(type, 0 /* String */);
            var numberIndexType = getIndexTypeOfType(type, 1 /* Number */);
            if (stringIndexType)
                stringIndexType = getWidenedType(stringIndexType);
            if (numberIndexType)
                numberIndexType = getWidenedType(numberIndexType);
            return createAnonymousType(type.symbol, members, emptyArray, emptyArray, stringIndexType, numberIndexType);
        }
        function getWidenedType(type) {
            if (type.flags & 6291456 /* RequiresWidening */) {
                if (type.flags & (32 /* Undefined */ | 64 /* Null */)) {
                    return anyType;
                }
                if (type.flags & 524288 /* ObjectLiteral */) {
                    return getWidenedTypeOfObjectLiteral(type);
                }
                if (type.flags & 16384 /* Union */) {
                    return getUnionType(ts.map(type.types, getWidenedType), /*noSubtypeReduction*/ true);
                }
                if (isArrayType(type)) {
                    return createArrayType(getWidenedType(type.typeArguments[0]));
                }
                if (isTupleType(type)) {
                    return createTupleType(ts.map(type.elementTypes, getWidenedType));
                }
            }
            return type;
        }
        /**
         * Reports implicit any errors that occur as a result of widening 'null' and 'undefined'
         * to 'any'. A call to reportWideningErrorsInType is normally accompanied by a call to
         * getWidenedType. But in some cases getWidenedType is called without reporting errors
         * (type argument inference is an example).
         *
         * The return value indicates whether an error was in fact reported. The particular circumstances
         * are on a best effort basis. Currently, if the null or undefined that causes widening is inside
         * an object literal property (arbitrarily deeply), this function reports an error. If no error is
         * reported, reportImplicitAnyError is a suitable fallback to report a general error.
         */
        function reportWideningErrorsInType(type) {
            var errorReported = false;
            if (type.flags & 16384 /* Union */) {
                for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                    var t = _a[_i];
                    if (reportWideningErrorsInType(t)) {
                        errorReported = true;
                    }
                }
            }
            if (isArrayType(type)) {
                return reportWideningErrorsInType(type.typeArguments[0]);
            }
            if (isTupleType(type)) {
                for (var _b = 0, _c = type.elementTypes; _b < _c.length; _b++) {
                    var t = _c[_b];
                    if (reportWideningErrorsInType(t)) {
                        errorReported = true;
                    }
                }
            }
            if (type.flags & 524288 /* ObjectLiteral */) {
                for (var _d = 0, _e = getPropertiesOfObjectType(type); _d < _e.length; _d++) {
                    var p = _e[_d];
                    var t = getTypeOfSymbol(p);
                    if (t.flags & 2097152 /* ContainsUndefinedOrNull */) {
                        if (!reportWideningErrorsInType(t)) {
                            error(p.valueDeclaration, ts.Diagnostics.Object_literal_s_property_0_implicitly_has_an_1_type, p.name, typeToString(getWidenedType(t)));
                        }
                        errorReported = true;
                    }
                }
            }
            return errorReported;
        }
        function reportImplicitAnyError(declaration, type) {
            var typeAsString = typeToString(getWidenedType(type));
            var diagnostic;
            switch (declaration.kind) {
                case 142 /* PropertyDeclaration */:
                case 141 /* PropertySignature */:
                    diagnostic = ts.Diagnostics.Member_0_implicitly_has_an_1_type;
                    break;
                case 139 /* Parameter */:
                    diagnostic = declaration.dotDotDotToken ?
                        ts.Diagnostics.Rest_parameter_0_implicitly_has_an_any_type :
                        ts.Diagnostics.Parameter_0_implicitly_has_an_1_type;
                    break;
                case 216 /* FunctionDeclaration */:
                case 144 /* MethodDeclaration */:
                case 143 /* MethodSignature */:
                case 146 /* GetAccessor */:
                case 147 /* SetAccessor */:
                case 176 /* FunctionExpression */:
                case 177 /* ArrowFunction */:
                    if (!declaration.name) {
                        error(declaration, ts.Diagnostics.Function_expression_which_lacks_return_type_annotation_implicitly_has_an_0_return_type, typeAsString);
                        return;
                    }
                    diagnostic = ts.Diagnostics._0_which_lacks_return_type_annotation_implicitly_has_an_1_return_type;
                    break;
                default:
                    diagnostic = ts.Diagnostics.Variable_0_implicitly_has_an_1_type;
            }
            error(declaration, diagnostic, ts.declarationNameToString(declaration.name), typeAsString);
        }
        function reportErrorsFromWidening(declaration, type) {
            if (produceDiagnostics && compilerOptions.noImplicitAny && type.flags & 2097152 /* ContainsUndefinedOrNull */) {
                // Report implicit any error within type if possible, otherwise report error on declaration
                if (!reportWideningErrorsInType(type)) {
                    reportImplicitAnyError(declaration, type);
                }
            }
        }
        function forEachMatchingParameterType(source, target, callback) {
            var sourceMax = source.parameters.length;
            var targetMax = target.parameters.length;
            var count;
            if (source.hasRestParameter && target.hasRestParameter) {
                count = sourceMax > targetMax ? sourceMax : targetMax;
                sourceMax--;
                targetMax--;
            }
            else if (source.hasRestParameter) {
                sourceMax--;
                count = targetMax;
            }
            else if (target.hasRestParameter) {
                targetMax--;
                count = sourceMax;
            }
            else {
                count = sourceMax < targetMax ? sourceMax : targetMax;
            }
            for (var i = 0; i < count; i++) {
                var s = i < sourceMax ? getTypeOfSymbol(source.parameters[i]) : getRestTypeOfSignature(source);
                var t = i < targetMax ? getTypeOfSymbol(target.parameters[i]) : getRestTypeOfSignature(target);
                callback(s, t);
            }
        }
        function createInferenceContext(typeParameters, inferUnionTypes) {
            var inferences = ts.map(typeParameters, createTypeInferencesObject);
            return {
                typeParameters: typeParameters,
                inferUnionTypes: inferUnionTypes,
                inferences: inferences,
                inferredTypes: new Array(typeParameters.length)
            };
        }
        function createTypeInferencesObject() {
            return {
                primary: undefined,
                secondary: undefined,
                isFixed: false
            };
        }
        function inferTypes(context, source, target) {
            var sourceStack;
            var targetStack;
            var depth = 0;
            var inferiority = 0;
            inferFromTypes(source, target);
            function isInProcess(source, target) {
                for (var i = 0; i < depth; i++) {
                    if (source === sourceStack[i] && target === targetStack[i]) {
                        return true;
                    }
                }
                return false;
            }
            function inferFromTypes(source, target) {
                if (source.flags & 16384 /* Union */ && target.flags & 16384 /* Union */ ||
                    source.flags & 32768 /* Intersection */ && target.flags & 32768 /* Intersection */) {
                    // Source and target are both unions or both intersections. First, find each
                    // target constituent type that has an identically matching source constituent
                    // type, and for each such target constituent type infer from the type to itself.
                    // When inferring from a type to itself we effectively find all type parameter
                    // occurrences within that type and infer themselves as their type arguments.
                    var matchingTypes = void 0;
                    for (var _i = 0, _a = target.types; _i < _a.length; _i++) {
                        var t = _a[_i];
                        if (typeIdenticalToSomeType(t, source.types)) {
                            (matchingTypes || (matchingTypes = [])).push(t);
                            inferFromTypes(t, t);
                        }
                    }
                    // Next, to improve the quality of inferences, reduce the source and target types by
                    // removing the identically matched constituents. For example, when inferring from
                    // 'string | string[]' to 'string | T' we reduce the types to 'string[]' and 'T'.
                    if (matchingTypes) {
                        source = removeTypesFromUnionOrIntersection(source, matchingTypes);
                        target = removeTypesFromUnionOrIntersection(target, matchingTypes);
                    }
                }
                if (target.flags & 512 /* TypeParameter */) {
                    // If target is a type parameter, make an inference, unless the source type contains
                    // the anyFunctionType (the wildcard type that's used to avoid contextually typing functions).
                    // Because the anyFunctionType is internal, it should not be exposed to the user by adding
                    // it as an inference candidate. Hopefully, a better candidate will come along that does
                    // not contain anyFunctionType when we come back to this argument for its second round
                    // of inference.
                    if (source.flags & 8388608 /* ContainsAnyFunctionType */) {
                        return;
                    }
                    var typeParameters = context.typeParameters;
                    for (var i = 0; i < typeParameters.length; i++) {
                        if (target === typeParameters[i]) {
                            var inferences = context.inferences[i];
                            if (!inferences.isFixed) {
                                // Any inferences that are made to a type parameter in a union type are inferior
                                // to inferences made to a flat (non-union) type. This is because if we infer to
                                // T | string[], we really don't know if we should be inferring to T or not (because
                                // the correct constituent on the target side could be string[]). Therefore, we put
                                // such inferior inferences into a secondary bucket, and only use them if the primary
                                // bucket is empty.
                                var candidates = inferiority ?
                                    inferences.secondary || (inferences.secondary = []) :
                                    inferences.primary || (inferences.primary = []);
                                if (!ts.contains(candidates, source)) {
                                    candidates.push(source);
                                }
                            }
                            return;
                        }
                    }
                }
                else if (source.flags & 4096 /* Reference */ && target.flags & 4096 /* Reference */ && source.target === target.target) {
                    // If source and target are references to the same generic type, infer from type arguments
                    var sourceTypes = source.typeArguments || emptyArray;
                    var targetTypes = target.typeArguments || emptyArray;
                    var count = sourceTypes.length < targetTypes.length ? sourceTypes.length : targetTypes.length;
                    for (var i = 0; i < count; i++) {
                        inferFromTypes(sourceTypes[i], targetTypes[i]);
                    }
                }
                else if (source.flags & 8192 /* Tuple */ && target.flags & 8192 /* Tuple */ && source.elementTypes.length === target.elementTypes.length) {
                    // If source and target are tuples of the same size, infer from element types
                    var sourceTypes = source.elementTypes;
                    var targetTypes = target.elementTypes;
                    for (var i = 0; i < sourceTypes.length; i++) {
                        inferFromTypes(sourceTypes[i], targetTypes[i]);
                    }
                }
                else if (target.flags & 49152 /* UnionOrIntersection */) {
                    var targetTypes = target.types;
                    var typeParameterCount = 0;
                    var typeParameter = void 0;
                    // First infer to each type in union or intersection that isn't a type parameter
                    for (var _b = 0, targetTypes_2 = targetTypes; _b < targetTypes_2.length; _b++) {
                        var t = targetTypes_2[_b];
                        if (t.flags & 512 /* TypeParameter */ && ts.contains(context.typeParameters, t)) {
                            typeParameter = t;
                            typeParameterCount++;
                        }
                        else {
                            inferFromTypes(source, t);
                        }
                    }
                    // Next, if target is a union type containing a single naked type parameter, make a
                    // secondary inference to that type parameter. We don't do this for intersection types
                    // because in a target type like Foo & T we don't know how which parts of the source type
                    // should be matched by Foo and which should be inferred to T.
                    if (target.flags & 16384 /* Union */ && typeParameterCount === 1) {
                        inferiority++;
                        inferFromTypes(source, typeParameter);
                        inferiority--;
                    }
                }
                else if (source.flags & 49152 /* UnionOrIntersection */) {
                    // Source is a union or intersection type, infer from each consituent type
                    var sourceTypes = source.types;
                    for (var _c = 0, sourceTypes_3 = sourceTypes; _c < sourceTypes_3.length; _c++) {
                        var sourceType = sourceTypes_3[_c];
                        inferFromTypes(sourceType, target);
                    }
                }
                else {
                    source = getApparentType(source);
                    if (source.flags & 80896 /* ObjectType */ && (target.flags & 4096 /* Reference */ && target.typeArguments ||
                        target.flags & 8192 /* Tuple */ ||
                        target.flags & 65536 /* Anonymous */ && target.symbol && target.symbol.flags & (8192 /* Method */ | 2048 /* TypeLiteral */ | 32 /* Class */))) {
                        // If source is an object type, and target is a type reference with type arguments, a tuple type,
                        // the type of a method, or a type literal, infer from members
                        if (isInProcess(source, target)) {
                            return;
                        }
                        if (isDeeplyNestedGeneric(source, sourceStack, depth) && isDeeplyNestedGeneric(target, targetStack, depth)) {
                            return;
                        }
                        if (depth === 0) {
                            sourceStack = [];
                            targetStack = [];
                        }
                        sourceStack[depth] = source;
                        targetStack[depth] = target;
                        depth++;
                        inferFromProperties(source, target);
                        inferFromSignatures(source, target, 0 /* Call */);
                        inferFromSignatures(source, target, 1 /* Construct */);
                        inferFromIndexTypes(source, target, 0 /* String */, 0 /* String */);
                        inferFromIndexTypes(source, target, 1 /* Number */, 1 /* Number */);
                        inferFromIndexTypes(source, target, 0 /* String */, 1 /* Number */);
                        depth--;
                    }
                }
            }
            function inferFromProperties(source, target) {
                var properties = getPropertiesOfObjectType(target);
                for (var _i = 0, properties_2 = properties; _i < properties_2.length; _i++) {
                    var targetProp = properties_2[_i];
                    var sourceProp = getPropertyOfObjectType(source, targetProp.name);
                    if (sourceProp) {
                        inferFromTypes(getTypeOfSymbol(sourceProp), getTypeOfSymbol(targetProp));
                    }
                }
            }
            function inferFromSignatures(source, target, kind) {
                var sourceSignatures = getSignaturesOfType(source, kind);
                var targetSignatures = getSignaturesOfType(target, kind);
                var sourceLen = sourceSignatures.length;
                var targetLen = targetSignatures.length;
                var len = sourceLen < targetLen ? sourceLen : targetLen;
                for (var i = 0; i < len; i++) {
                    inferFromSignature(getErasedSignature(sourceSignatures[sourceLen - len + i]), getErasedSignature(targetSignatures[targetLen - len + i]));
                }
            }
            function inferFromSignature(source, target) {
                forEachMatchingParameterType(source, target, inferFromTypes);
                if (source.typePredicate && target.typePredicate && source.typePredicate.kind === target.typePredicate.kind) {
                    inferFromTypes(source.typePredicate.type, target.typePredicate.type);
                }
                else {
                    inferFromTypes(getReturnTypeOfSignature(source), getReturnTypeOfSignature(target));
                }
            }
            function inferFromIndexTypes(source, target, sourceKind, targetKind) {
                var targetIndexType = getIndexTypeOfType(target, targetKind);
                if (targetIndexType) {
                    var sourceIndexType = getIndexTypeOfType(source, sourceKind);
                    if (sourceIndexType) {
                        inferFromTypes(sourceIndexType, targetIndexType);
                    }
                }
            }
        }
        function typeIdenticalToSomeType(type, types) {
            for (var _i = 0, types_7 = types; _i < types_7.length; _i++) {
                var t = types_7[_i];
                if (isTypeIdenticalTo(t, type)) {
                    return true;
                }
            }
            return false;
        }
        /**
         * Return a new union or intersection type computed by removing a given set of types
         * from a given union or intersection type.
         */
        function removeTypesFromUnionOrIntersection(type, typesToRemove) {
            var reducedTypes = [];
            for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                var t = _a[_i];
                if (!typeIdenticalToSomeType(t, typesToRemove)) {
                    reducedTypes.push(t);
                }
            }
            return type.flags & 16384 /* Union */ ? getUnionType(reducedTypes, /*noSubtypeReduction*/ true) : getIntersectionType(reducedTypes);
        }
        function getInferenceCandidates(context, index) {
            var inferences = context.inferences[index];
            return inferences.primary || inferences.secondary || emptyArray;
        }
        function getInferredType(context, index) {
            var inferredType = context.inferredTypes[index];
            var inferenceSucceeded;
            if (!inferredType) {
                var inferences = getInferenceCandidates(context, index);
                if (inferences.length) {
                    // Infer widened union or supertype, or the unknown type for no common supertype
                    var unionOrSuperType = context.inferUnionTypes ? getUnionType(inferences) : getCommonSupertype(inferences);
                    inferredType = unionOrSuperType ? getWidenedType(unionOrSuperType) : unknownType;
                    inferenceSucceeded = !!unionOrSuperType;
                }
                else {
                    // Infer the empty object type when no inferences were made. It is important to remember that
                    // in this case, inference still succeeds, meaning there is no error for not having inference
                    // candidates. An inference error only occurs when there are *conflicting* candidates, i.e.
                    // candidates with no common supertype.
                    inferredType = emptyObjectType;
                    inferenceSucceeded = true;
                }
                context.inferredTypes[index] = inferredType;
                // Only do the constraint check if inference succeeded (to prevent cascading errors)
                if (inferenceSucceeded) {
                    var constraint = getConstraintOfTypeParameter(context.typeParameters[index]);
                    if (constraint) {
                        var instantiatedConstraint = instantiateType(constraint, getInferenceMapper(context));
                        if (!isTypeAssignableTo(inferredType, getTypeWithThisArgument(instantiatedConstraint, inferredType))) {
                            context.inferredTypes[index] = inferredType = instantiatedConstraint;
                        }
                    }
                }
                else if (context.failedTypeParameterIndex === undefined || context.failedTypeParameterIndex > index) {
                    // If inference failed, it is necessary to record the index of the failed type parameter (the one we are on).
                    // It might be that inference has already failed on a later type parameter on a previous call to inferTypeArguments.
                    // So if this failure is on preceding type parameter, this type parameter is the new failure index.
                    context.failedTypeParameterIndex = index;
                }
            }
            return inferredType;
        }
        function getInferredTypes(context) {
            for (var i = 0; i < context.inferredTypes.length; i++) {
                getInferredType(context, i);
            }
            return context.inferredTypes;
        }
        // EXPRESSION TYPE CHECKING
        function getResolvedSymbol(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedSymbol) {
                links.resolvedSymbol = (!ts.nodeIsMissing(node) && resolveName(node, node.text, 107455 /* Value */ | 1048576 /* ExportValue */, ts.Diagnostics.Cannot_find_name_0, node)) || unknownSymbol;
            }
            return links.resolvedSymbol;
        }
        function isInTypeQuery(node) {
            // TypeScript 1.0 spec (April 2014): 3.6.3
            // A type query consists of the keyword typeof followed by an expression.
            // The expression is restricted to a single identifier or a sequence of identifiers separated by periods
            while (node) {
                switch (node.kind) {
                    case 155 /* TypeQuery */:
                        return true;
                    case 69 /* Identifier */:
                    case 136 /* QualifiedName */:
                        node = node.parent;
                        continue;
                    default:
                        return false;
                }
            }
            ts.Debug.fail("should not get here");
        }
        function hasInitializer(node) {
            return !!(node.initializer || ts.isBindingPattern(node.parent) && hasInitializer(node.parent.parent));
        }
        // Check if a given variable is assigned within a given syntax node
        function isVariableAssignedWithin(symbol, node) {
            var links = getNodeLinks(node);
            if (links.assignmentChecks) {
                var cachedResult = links.assignmentChecks[symbol.id];
                if (cachedResult !== undefined) {
                    return cachedResult;
                }
            }
            else {
                links.assignmentChecks = {};
            }
            return links.assignmentChecks[symbol.id] = isAssignedIn(node);
            function isAssignedInBinaryExpression(node) {
                if (node.operatorToken.kind >= 56 /* FirstAssignment */ && node.operatorToken.kind <= 68 /* LastAssignment */) {
                    var n = skipParenthesizedNodes(node.left);
                    if (n.kind === 69 /* Identifier */ && getResolvedSymbol(n) === symbol) {
                        return true;
                    }
                }
                return ts.forEachChild(node, isAssignedIn);
            }
            function isAssignedInVariableDeclaration(node) {
                if (!ts.isBindingPattern(node.name) && getSymbolOfNode(node) === symbol && hasInitializer(node)) {
                    return true;
                }
                return ts.forEachChild(node, isAssignedIn);
            }
            function isAssignedIn(node) {
                switch (node.kind) {
                    case 184 /* BinaryExpression */:
                        return isAssignedInBinaryExpression(node);
                    case 214 /* VariableDeclaration */:
                    case 166 /* BindingElement */:
                        return isAssignedInVariableDeclaration(node);
                    case 164 /* ObjectBindingPattern */:
                    case 165 /* ArrayBindingPattern */:
                    case 167 /* ArrayLiteralExpression */:
                    case 168 /* ObjectLiteralExpression */:
                    case 169 /* PropertyAccessExpression */:
                    case 170 /* ElementAccessExpression */:
                    case 171 /* CallExpression */:
                    case 172 /* NewExpression */:
                    case 174 /* TypeAssertionExpression */:
                    case 192 /* AsExpression */:
                    case 175 /* ParenthesizedExpression */:
                    case 182 /* PrefixUnaryExpression */:
                    case 178 /* DeleteExpression */:
                    case 181 /* AwaitExpression */:
                    case 179 /* TypeOfExpression */:
                    case 180 /* VoidExpression */:
                    case 183 /* PostfixUnaryExpression */:
                    case 187 /* YieldExpression */:
                    case 185 /* ConditionalExpression */:
                    case 188 /* SpreadElementExpression */:
                    case 195 /* Block */:
                    case 196 /* VariableStatement */:
                    case 198 /* ExpressionStatement */:
                    case 199 /* IfStatement */:
                    case 200 /* DoStatement */:
                    case 201 /* WhileStatement */:
                    case 202 /* ForStatement */:
                    case 203 /* ForInStatement */:
                    case 204 /* ForOfStatement */:
                    case 207 /* ReturnStatement */:
                    case 208 /* WithStatement */:
                    case 209 /* SwitchStatement */:
                    case 244 /* CaseClause */:
                    case 245 /* DefaultClause */:
                    case 210 /* LabeledStatement */:
                    case 211 /* ThrowStatement */:
                    case 212 /* TryStatement */:
                    case 247 /* CatchClause */:
                    case 236 /* JsxElement */:
                    case 237 /* JsxSelfClosingElement */:
                    case 241 /* JsxAttribute */:
                    case 242 /* JsxSpreadAttribute */:
                    case 238 /* JsxOpeningElement */:
                    case 243 /* JsxExpression */:
                        return ts.forEachChild(node, isAssignedIn);
                }
                return false;
            }
        }
        // Get the narrowed type of a given symbol at a given location
        function getNarrowedTypeOfSymbol(symbol, node) {
            var type = getTypeOfSymbol(symbol);
            // Only narrow when symbol is variable of type any or an object, union, or type parameter type
            if (node && symbol.flags & 3 /* Variable */) {
                if (isTypeAny(type) || type.flags & (80896 /* ObjectType */ | 16384 /* Union */ | 512 /* TypeParameter */)) {
                    var declaration = ts.getDeclarationOfKind(symbol, 214 /* VariableDeclaration */);
                    var top_1 = declaration && getDeclarationContainer(declaration);
                    var originalType = type;
                    var nodeStack = [];
                    loop: while (node.parent) {
                        var child = node;
                        node = node.parent;
                        switch (node.kind) {
                            case 199 /* IfStatement */:
                            case 185 /* ConditionalExpression */:
                            case 184 /* BinaryExpression */:
                                nodeStack.push({ node: node, child: child });
                                break;
                            case 251 /* SourceFile */:
                            case 221 /* ModuleDeclaration */:
                                // Stop at the first containing file or module declaration
                                break loop;
                        }
                        if (node === top_1) {
                            break;
                        }
                    }
                    var nodes = void 0;
                    while (nodes = nodeStack.pop()) {
                        var node_1 = nodes.node, child = nodes.child;
                        switch (node_1.kind) {
                            case 199 /* IfStatement */:
                                // In a branch of an if statement, narrow based on controlling expression
                                if (child !== node_1.expression) {
                                    type = narrowType(type, node_1.expression, /*assumeTrue*/ child === node_1.thenStatement);
                                }
                                break;
                            case 185 /* ConditionalExpression */:
                                // In a branch of a conditional expression, narrow based on controlling condition
                                if (child !== node_1.condition) {
                                    type = narrowType(type, node_1.condition, /*assumeTrue*/ child === node_1.whenTrue);
                                }
                                break;
                            case 184 /* BinaryExpression */:
                                // In the right operand of an && or ||, narrow based on left operand
                                if (child === node_1.right) {
                                    if (node_1.operatorToken.kind === 51 /* AmpersandAmpersandToken */) {
                                        type = narrowType(type, node_1.left, /*assumeTrue*/ true);
                                    }
                                    else if (node_1.operatorToken.kind === 52 /* BarBarToken */) {
                                        type = narrowType(type, node_1.left, /*assumeTrue*/ false);
                                    }
                                }
                                break;
                            default:
                                ts.Debug.fail("Unreachable!");
                        }
                        // Use original type if construct contains assignments to variable
                        if (type !== originalType && isVariableAssignedWithin(symbol, node_1)) {
                            type = originalType;
                        }
                    }
                    // Preserve old top-level behavior - if the branch is really an empty set, revert to prior type
                    if (type === emptyUnionType) {
                        type = originalType;
                    }
                }
            }
            return type;
            function narrowTypeByEquality(type, expr, assumeTrue) {
                // Check that we have 'typeof <symbol>' on the left and string literal on the right
                if (expr.left.kind !== 179 /* TypeOfExpression */ || expr.right.kind !== 9 /* StringLiteral */) {
                    return type;
                }
                var left = expr.left;
                var right = expr.right;
                if (left.expression.kind !== 69 /* Identifier */ || getResolvedSymbol(left.expression) !== symbol) {
                    return type;
                }
                if (expr.operatorToken.kind === 33 /* ExclamationEqualsEqualsToken */) {
                    assumeTrue = !assumeTrue;
                }
                var typeInfo = primitiveTypeInfo[right.text];
                // Don't narrow `undefined`
                if (typeInfo && typeInfo.type === undefinedType) {
                    return type;
                }
                var flags;
                if (typeInfo) {
                    flags = typeInfo.flags;
                }
                else {
                    assumeTrue = !assumeTrue;
                    flags = 132 /* NumberLike */ | 258 /* StringLike */ | 16777216 /* ESSymbol */ | 8 /* Boolean */;
                }
                // At this point we can bail if it's not a union
                if (!(type.flags & 16384 /* Union */)) {
                    // If we're on the true branch and the type is a subtype, we should return the primitive type
                    if (assumeTrue && typeInfo && isTypeSubtypeOf(typeInfo.type, type)) {
                        return typeInfo.type;
                    }
                    // If the active non-union type would be removed from a union by this type guard, return an empty union
                    return filterUnion(type) ? type : emptyUnionType;
                }
                return getUnionType(ts.filter(type.types, filterUnion), /*noSubtypeReduction*/ true);
                function filterUnion(type) {
                    return assumeTrue === !!(type.flags & flags);
                }
            }
            function narrowTypeByAnd(type, expr, assumeTrue) {
                if (assumeTrue) {
                    // The assumed result is true, therefore we narrow assuming each operand to be true.
                    return narrowType(narrowType(type, expr.left, /*assumeTrue*/ true), expr.right, /*assumeTrue*/ true);
                }
                else {
                    // The assumed result is false. This means either the first operand was false, or the first operand was true
                    // and the second operand was false. We narrow with those assumptions and union the two resulting types.
                    return getUnionType([
                        narrowType(type, expr.left, /*assumeTrue*/ false),
                        narrowType(type, expr.right, /*assumeTrue*/ false)
                    ]);
                }
            }
            function narrowTypeByOr(type, expr, assumeTrue) {
                if (assumeTrue) {
                    // The assumed result is true. This means either the first operand was true, or the first operand was false
                    // and the second operand was true. We narrow with those assumptions and union the two resulting types.
                    return getUnionType([
                        narrowType(type, expr.left, /*assumeTrue*/ true),
                        narrowType(type, expr.right, /*assumeTrue*/ true)
                    ]);
                }
                else {
                    // The assumed result is false, therefore we narrow assuming each operand to be false.
                    return narrowType(narrowType(type, expr.left, /*assumeTrue*/ false), expr.right, /*assumeTrue*/ false);
                }
            }
            function narrowTypeByInstanceof(type, expr, assumeTrue) {
                // Check that type is not any, assumed result is true, and we have variable symbol on the left
                if (isTypeAny(type) || expr.left.kind !== 69 /* Identifier */ || getResolvedSymbol(expr.left) !== symbol) {
                    return type;
                }
                // Check that right operand is a function type with a prototype property
                var rightType = checkExpression(expr.right);
                if (!isTypeSubtypeOf(rightType, globalFunctionType)) {
                    return type;
                }
                var targetType;
                var prototypeProperty = getPropertyOfType(rightType, "prototype");
                if (prototypeProperty) {
                    // Target type is type of the prototype property
                    var prototypePropertyType = getTypeOfSymbol(prototypeProperty);
                    if (!isTypeAny(prototypePropertyType)) {
                        targetType = prototypePropertyType;
                    }
                }
                if (!targetType) {
                    // Target type is type of construct signature
                    var constructSignatures = void 0;
                    if (rightType.flags & 2048 /* Interface */) {
                        constructSignatures = resolveDeclaredMembers(rightType).declaredConstructSignatures;
                    }
                    else if (rightType.flags & 65536 /* Anonymous */) {
                        constructSignatures = getSignaturesOfType(rightType, 1 /* Construct */);
                    }
                    if (constructSignatures && constructSignatures.length) {
                        targetType = getUnionType(ts.map(constructSignatures, function (signature) { return getReturnTypeOfSignature(getErasedSignature(signature)); }));
                    }
                }
                if (targetType) {
                    return getNarrowedType(type, targetType, assumeTrue);
                }
                return type;
            }
            function getNarrowedType(originalType, narrowedTypeCandidate, assumeTrue) {
                if (!assumeTrue) {
                    if (originalType.flags & 16384 /* Union */) {
                        return getUnionType(ts.filter(originalType.types, function (t) { return !isTypeSubtypeOf(t, narrowedTypeCandidate); }));
                    }
                    return originalType;
                }
                // If the current type is a union type, remove all constituents that aren't assignable to target. If that produces
                // 0 candidates, fall back to the assignability check
                if (originalType.flags & 16384 /* Union */) {
                    var assignableConstituents = ts.filter(originalType.types, function (t) { return isTypeAssignableTo(t, narrowedTypeCandidate); });
                    if (assignableConstituents.length) {
                        return getUnionType(assignableConstituents);
                    }
                }
                if (isTypeAssignableTo(narrowedTypeCandidate, originalType)) {
                    // Narrow to the target type if it's assignable to the current type
                    return narrowedTypeCandidate;
                }
                return originalType;
            }
            function narrowTypeByTypePredicate(type, callExpression, assumeTrue) {
                if (type.flags & 1 /* Any */) {
                    return type;
                }
                var signature = getResolvedSignature(callExpression);
                var predicate = signature.typePredicate;
                if (!predicate) {
                    return type;
                }
                if (ts.isIdentifierTypePredicate(predicate)) {
                    if (callExpression.arguments[predicate.parameterIndex] &&
                        getSymbolAtTypePredicatePosition(callExpression.arguments[predicate.parameterIndex]) === symbol) {
                        return getNarrowedType(type, predicate.type, assumeTrue);
                    }
                }
                else {
                    var invokedExpression = skipParenthesizedNodes(callExpression.expression);
                    return narrowTypeByThisTypePredicate(type, predicate, invokedExpression, assumeTrue);
                }
                return type;
            }
            function narrowTypeByThisTypePredicate(type, predicate, invokedExpression, assumeTrue) {
                if (invokedExpression.kind === 170 /* ElementAccessExpression */ || invokedExpression.kind === 169 /* PropertyAccessExpression */) {
                    var accessExpression = invokedExpression;
                    var possibleIdentifier = skipParenthesizedNodes(accessExpression.expression);
                    if (possibleIdentifier.kind === 69 /* Identifier */ && getSymbolAtTypePredicatePosition(possibleIdentifier) === symbol) {
                        return getNarrowedType(type, predicate.type, assumeTrue);
                    }
                }
                return type;
            }
            function getSymbolAtTypePredicatePosition(expr) {
                expr = skipParenthesizedNodes(expr);
                switch (expr.kind) {
                    case 69 /* Identifier */:
                    case 169 /* PropertyAccessExpression */:
                        return getSymbolOfEntityNameOrPropertyAccessExpression(expr);
                }
            }
            // Narrow the given type based on the given expression having the assumed boolean value. The returned type
            // will be a subtype or the same type as the argument.
            function narrowType(type, expr, assumeTrue) {
                switch (expr.kind) {
                    case 171 /* CallExpression */:
                        return narrowTypeByTypePredicate(type, expr, assumeTrue);
                    case 175 /* ParenthesizedExpression */:
                        return narrowType(type, expr.expression, assumeTrue);
                    case 184 /* BinaryExpression */:
                        var operator = expr.operatorToken.kind;
                        if (operator === 32 /* EqualsEqualsEqualsToken */ || operator === 33 /* ExclamationEqualsEqualsToken */) {
                            return narrowTypeByEquality(type, expr, assumeTrue);
                        }
                        else if (operator === 51 /* AmpersandAmpersandToken */) {
                            return narrowTypeByAnd(type, expr, assumeTrue);
                        }
                        else if (operator === 52 /* BarBarToken */) {
                            return narrowTypeByOr(type, expr, assumeTrue);
                        }
                        else if (operator === 91 /* InstanceOfKeyword */) {
                            return narrowTypeByInstanceof(type, expr, assumeTrue);
                        }
                        break;
                    case 182 /* PrefixUnaryExpression */:
                        if (expr.operator === 49 /* ExclamationToken */) {
                            return narrowType(type, expr.operand, !assumeTrue);
                        }
                        break;
                }
                return type;
            }
        }
        function skipParenthesizedNodes(expression) {
            while (expression.kind === 175 /* ParenthesizedExpression */) {
                expression = expression.expression;
            }
            return expression;
        }
        function checkIdentifier(node) {
            var symbol = getResolvedSymbol(node);
            // As noted in ECMAScript 6 language spec, arrow functions never have an arguments objects.
            // Although in down-level emit of arrow function, we emit it using function expression which means that
            // arguments objects will be bound to the inner object; emitting arrow function natively in ES6, arguments objects
            // will be bound to non-arrow function that contain this arrow function. This results in inconsistent behavior.
            // To avoid that we will give an error to users if they use arguments objects in arrow function so that they
            // can explicitly bound arguments objects
            if (symbol === argumentsSymbol) {
                var container = ts.getContainingFunction(node);
                if (container.kind === 177 /* ArrowFunction */) {
                    if (languageVersion < 2 /* ES6 */) {
                        error(node, ts.Diagnostics.The_arguments_object_cannot_be_referenced_in_an_arrow_function_in_ES3_and_ES5_Consider_using_a_standard_function_expression);
                    }
                }
                if (node.parserContextFlags & 8 /* Await */) {
                    getNodeLinks(container).flags |= 8192 /* CaptureArguments */;
                }
            }
            if (symbol.flags & 8388608 /* Alias */ && !isInTypeQuery(node) && !isConstEnumOrConstEnumOnlyModule(resolveAlias(symbol))) {
                markAliasSymbolAsReferenced(symbol);
            }
            var localOrExportSymbol = getExportSymbolOfValueSymbolIfExported(symbol);
            // Due to the emit for class decorators, any reference to the class from inside of the class body
            // must instead be rewritten to point to a temporary variable to avoid issues with the double-bind
            // behavior of class names in ES6.
            if (languageVersion === 2 /* ES6 */
                && localOrExportSymbol.flags & 32 /* Class */
                && localOrExportSymbol.valueDeclaration.kind === 217 /* ClassDeclaration */
                && ts.nodeIsDecorated(localOrExportSymbol.valueDeclaration)) {
                var container = ts.getContainingClass(node);
                while (container !== undefined) {
                    if (container === localOrExportSymbol.valueDeclaration && container.name !== node) {
                        getNodeLinks(container).flags |= 524288 /* ClassWithBodyScopedClassBinding */;
                        getNodeLinks(node).flags |= 1048576 /* BodyScopedClassBinding */;
                        break;
                    }
                    container = ts.getContainingClass(container);
                }
            }
            checkCollisionWithCapturedSuperVariable(node, node);
            checkCollisionWithCapturedThisVariable(node, node);
            checkNestedBlockScopedBinding(node, symbol);
            return getNarrowedTypeOfSymbol(localOrExportSymbol, node);
        }
        function isInsideFunction(node, threshold) {
            var current = node;
            while (current && current !== threshold) {
                if (ts.isFunctionLike(current)) {
                    return true;
                }
                current = current.parent;
            }
            return false;
        }
        function checkNestedBlockScopedBinding(node, symbol) {
            if (languageVersion >= 2 /* ES6 */ ||
                (symbol.flags & (2 /* BlockScopedVariable */ | 32 /* Class */)) === 0 ||
                symbol.valueDeclaration.parent.kind === 247 /* CatchClause */) {
                return;
            }
            // 1. walk from the use site up to the declaration and check
            // if there is anything function like between declaration and use-site (is binding/class is captured in function).
            // 2. walk from the declaration up to the boundary of lexical environment and check
            // if there is an iteration statement in between declaration and boundary (is binding/class declared inside iteration statement)
            var container = ts.getEnclosingBlockScopeContainer(symbol.valueDeclaration);
            var usedInFunction = isInsideFunction(node.parent, container);
            var current = container;
            var containedInIterationStatement = false;
            while (current && !ts.nodeStartsNewLexicalEnvironment(current)) {
                if (ts.isIterationStatement(current, /*lookInLabeledStatements*/ false)) {
                    containedInIterationStatement = true;
                    break;
                }
                current = current.parent;
            }
            if (containedInIterationStatement) {
                if (usedInFunction) {
                    // mark iteration statement as containing block-scoped binding captured in some function
                    getNodeLinks(current).flags |= 65536 /* LoopWithCapturedBlockScopedBinding */;
                }
                // mark variables that are declared in loop initializer and reassigned inside the body of ForStatement.
                // if body of ForStatement will be converted to function then we'll need a extra machinery to propagate reassigned values back.
                if (container.kind === 202 /* ForStatement */ &&
                    ts.getAncestor(symbol.valueDeclaration, 215 /* VariableDeclarationList */).parent === container &&
                    isAssignedInBodyOfForStatement(node, container)) {
                    getNodeLinks(symbol.valueDeclaration).flags |= 2097152 /* NeedsLoopOutParameter */;
                }
                // set 'declared inside loop' bit on the block-scoped binding
                getNodeLinks(symbol.valueDeclaration).flags |= 262144 /* BlockScopedBindingInLoop */;
            }
            if (usedInFunction) {
                getNodeLinks(symbol.valueDeclaration).flags |= 131072 /* CapturedBlockScopedBinding */;
            }
        }
        function isAssignedInBodyOfForStatement(node, container) {
            var current = node;
            // skip parenthesized nodes
            while (current.parent.kind === 175 /* ParenthesizedExpression */) {
                current = current.parent;
            }
            // check if node is used as LHS in some assignment expression
            var isAssigned = false;
            if (current.parent.kind === 184 /* BinaryExpression */) {
                isAssigned = current.parent.left === current && ts.isAssignmentOperator(current.parent.operatorToken.kind);
            }
            if ((current.parent.kind === 182 /* PrefixUnaryExpression */ || current.parent.kind === 183 /* PostfixUnaryExpression */)) {
                var expr = current.parent;
                isAssigned = expr.operator === 41 /* PlusPlusToken */ || expr.operator === 42 /* MinusMinusToken */;
            }
            if (!isAssigned) {
                return false;
            }
            // at this point we know that node is the target of assignment
            // now check that modification happens inside the statement part of the ForStatement
            while (current !== container) {
                if (current === container.statement) {
                    return true;
                }
                else {
                    current = current.parent;
                }
            }
            return false;
        }
        function captureLexicalThis(node, container) {
            getNodeLinks(node).flags |= 2 /* LexicalThis */;
            if (container.kind === 142 /* PropertyDeclaration */ || container.kind === 145 /* Constructor */) {
                var classNode = container.parent;
                getNodeLinks(classNode).flags |= 4 /* CaptureThis */;
            }
            else {
                getNodeLinks(container).flags |= 4 /* CaptureThis */;
            }
        }
        function findFirstSuperCall(n) {
            if (ts.isSuperCallExpression(n)) {
                return n;
            }
            else if (ts.isFunctionLike(n)) {
                return undefined;
            }
            return ts.forEachChild(n, findFirstSuperCall);
        }
        /**
         * Return a cached result if super-statement is already found.
         * Otherwise, find a super statement in a given constructor function and cache the result in the node-links of the constructor
         *
         * @param constructor constructor-function to look for super statement
         */
        function getSuperCallInConstructor(constructor) {
            var links = getNodeLinks(constructor);
            // Only trying to find super-call if we haven't yet tried to find one.  Once we try, we will record the result
            if (links.hasSuperCall === undefined) {
                links.superCall = findFirstSuperCall(constructor.body);
                links.hasSuperCall = links.superCall ? true : false;
            }
            return links.superCall;
        }
        /**
         * Check if the given class-declaration extends null then return true.
         * Otherwise, return false
         * @param classDecl a class declaration to check if it extends null
         */
        function classDeclarationExtendsNull(classDecl) {
            var classSymbol = getSymbolOfNode(classDecl);
            var classInstanceType = getDeclaredTypeOfSymbol(classSymbol);
            var baseConstructorType = getBaseConstructorTypeOfClass(classInstanceType);
            return baseConstructorType === nullType;
        }
        function checkThisExpression(node) {
            // Stop at the first arrow function so that we can
            // tell whether 'this' needs to be captured.
            var container = ts.getThisContainer(node, /* includeArrowFunctions */ true);
            var needToCaptureLexicalThis = false;
            if (container.kind === 145 /* Constructor */) {
                var containingClassDecl = container.parent;
                var baseTypeNode = ts.getClassExtendsHeritageClauseElement(containingClassDecl);
                // If a containing class does not have extends clause or the class extends null
                // skip checking whether super statement is called before "this" accessing.
                if (baseTypeNode && !classDeclarationExtendsNull(containingClassDecl)) {
                    var superCall = getSuperCallInConstructor(container);
                    // We should give an error in the following cases:
                    //      - No super-call
                    //      - "this" is accessing before super-call.
                    //          i.e super(this)
                    //              this.x; super();
                    // We want to make sure that super-call is done before accessing "this" so that
                    // "this" is not accessed as a parameter of the super-call.
                    if (!superCall || superCall.end > node.pos) {
                        // In ES6, super inside constructor of class-declaration has to precede "this" accessing
                        error(node, ts.Diagnostics.super_must_be_called_before_accessing_this_in_the_constructor_of_a_derived_class);
                    }
                }
            }
            // Now skip arrow functions to get the "real" owner of 'this'.
            if (container.kind === 177 /* ArrowFunction */) {
                container = ts.getThisContainer(container, /* includeArrowFunctions */ false);
                // When targeting es6, arrow function lexically bind "this" so we do not need to do the work of binding "this" in emitted code
                needToCaptureLexicalThis = (languageVersion < 2 /* ES6 */);
            }
            switch (container.kind) {
                case 221 /* ModuleDeclaration */:
                    error(node, ts.Diagnostics.this_cannot_be_referenced_in_a_module_or_namespace_body);
                    // do not return here so in case if lexical this is captured - it will be reflected in flags on NodeLinks
                    break;
                case 220 /* EnumDeclaration */:
                    error(node, ts.Diagnostics.this_cannot_be_referenced_in_current_location);
                    // do not return here so in case if lexical this is captured - it will be reflected in flags on NodeLinks
                    break;
                case 145 /* Constructor */:
                    if (isInConstructorArgumentInitializer(node, container)) {
                        error(node, ts.Diagnostics.this_cannot_be_referenced_in_constructor_arguments);
                    }
                    break;
                case 142 /* PropertyDeclaration */:
                case 141 /* PropertySignature */:
                    if (container.flags & 64 /* Static */) {
                        error(node, ts.Diagnostics.this_cannot_be_referenced_in_a_static_property_initializer);
                    }
                    break;
                case 137 /* ComputedPropertyName */:
                    error(node, ts.Diagnostics.this_cannot_be_referenced_in_a_computed_property_name);
                    break;
            }
            if (needToCaptureLexicalThis) {
                captureLexicalThis(node, container);
            }
            if (ts.isClassLike(container.parent)) {
                var symbol = getSymbolOfNode(container.parent);
                return container.flags & 64 /* Static */ ? getTypeOfSymbol(symbol) : getDeclaredTypeOfSymbol(symbol).thisType;
            }
            if (ts.isInJavaScriptFile(node)) {
                var type = getTypeForThisExpressionFromJSDoc(container);
                if (type && type !== unknownType) {
                    return type;
                }
                // If this is a function in a JS file, it might be a class method. Check if it's the RHS
                // of a x.prototype.y = function [name]() { .... }
                if (container.kind === 176 /* FunctionExpression */) {
                    if (ts.getSpecialPropertyAssignmentKind(container.parent) === 3 /* PrototypeProperty */) {
                        // Get the 'x' of 'x.prototype.y = f' (here, 'f' is 'container')
                        var className = container.parent // x.protoype.y = f
                            .left // x.prototype.y
                            .expression // x.prototype
                            .expression; // x
                        var classSymbol = checkExpression(className).symbol;
                        if (classSymbol && classSymbol.members && (classSymbol.flags & 16 /* Function */)) {
                            return getInferredClassType(classSymbol);
                        }
                    }
                }
            }
            return anyType;
        }
        function getTypeForThisExpressionFromJSDoc(node) {
            var typeTag = ts.getJSDocTypeTag(node);
            if (typeTag && typeTag.typeExpression && typeTag.typeExpression.type && typeTag.typeExpression.type.kind === 264 /* JSDocFunctionType */) {
                var jsDocFunctionType = typeTag.typeExpression.type;
                if (jsDocFunctionType.parameters.length > 0 && jsDocFunctionType.parameters[0].type.kind === 267 /* JSDocThisType */) {
                    return getTypeFromTypeNode(jsDocFunctionType.parameters[0].type);
                }
            }
        }
        function isInConstructorArgumentInitializer(node, constructorDecl) {
            for (var n = node; n && n !== constructorDecl; n = n.parent) {
                if (n.kind === 139 /* Parameter */) {
                    return true;
                }
            }
            return false;
        }
        function checkSuperExpression(node) {
            var isCallExpression = node.parent.kind === 171 /* CallExpression */ && node.parent.expression === node;
            var container = ts.getSuperContainer(node, /*stopOnFunctions*/ true);
            var needToCaptureLexicalThis = false;
            if (!isCallExpression) {
                // adjust the container reference in case if super is used inside arrow functions with arbitrary deep nesting
                while (container && container.kind === 177 /* ArrowFunction */) {
                    container = ts.getSuperContainer(container, /*stopOnFunctions*/ true);
                    needToCaptureLexicalThis = languageVersion < 2 /* ES6 */;
                }
            }
            var canUseSuperExpression = isLegalUsageOfSuperExpression(container);
            var nodeCheckFlag = 0;
            if (!canUseSuperExpression) {
                // issue more specific error if super is used in computed property name
                // class A { foo() { return "1" }}
                // class B {
                //     [super.foo()]() {}
                // }
                var current = node;
                while (current && current !== container && current.kind !== 137 /* ComputedPropertyName */) {
                    current = current.parent;
                }
                if (current && current.kind === 137 /* ComputedPropertyName */) {
                    error(node, ts.Diagnostics.super_cannot_be_referenced_in_a_computed_property_name);
                }
                else if (isCallExpression) {
                    error(node, ts.Diagnostics.Super_calls_are_not_permitted_outside_constructors_or_in_nested_functions_inside_constructors);
                }
                else if (!container || !container.parent || !(ts.isClassLike(container.parent) || container.parent.kind === 168 /* ObjectLiteralExpression */)) {
                    error(node, ts.Diagnostics.super_can_only_be_referenced_in_members_of_derived_classes_or_object_literal_expressions);
                }
                else {
                    error(node, ts.Diagnostics.super_property_access_is_permitted_only_in_a_constructor_member_function_or_member_accessor_of_a_derived_class);
                }
                return unknownType;
            }
            if ((container.flags & 64 /* Static */) || isCallExpression) {
                nodeCheckFlag = 512 /* SuperStatic */;
            }
            else {
                nodeCheckFlag = 256 /* SuperInstance */;
            }
            getNodeLinks(node).flags |= nodeCheckFlag;
            // Due to how we emit async functions, we need to specialize the emit for an async method that contains a `super` reference.
            // This is due to the fact that we emit the body of an async function inside of a generator function. As generator
            // functions cannot reference `super`, we emit a helper inside of the method body, but outside of the generator. This helper
            // uses an arrow function, which is permitted to reference `super`.
            //
            // There are two primary ways we can access `super` from within an async method. The first is getting the value of a property
            // or indexed access on super, either as part of a right-hand-side expression or call expression. The second is when setting the value
            // of a property or indexed access, either as part of an assignment expression or destructuring assignment.
            //
            // The simplest case is reading a value, in which case we will emit something like the following:
            //
            //  // ts
            //  ...
            //  async asyncMethod() {
            //    let x = await super.asyncMethod();
            //    return x;
            //  }
            //  ...
            //
            //  // js
            //  ...
            //  asyncMethod() {
            //      const _super = name => super[name];
            //      return __awaiter(this, arguments, Promise, function *() {
            //          let x = yield _super("asyncMethod").call(this);
            //          return x;
            //      });
            //  }
            //  ...
            //
            // The more complex case is when we wish to assign a value, especially as part of a destructuring assignment. As both cases
            // are legal in ES6, but also likely less frequent, we emit the same more complex helper for both scenarios:
            //
            //  // ts
            //  ...
            //  async asyncMethod(ar: Promise<any[]>) {
            //      [super.a, super.b] = await ar;
            //  }
            //  ...
            //
            //  // js
            //  ...
            //  asyncMethod(ar) {
            //      const _super = (function (geti, seti) {
            //          const cache = Object.create(null);
            //          return name => cache[name] || (cache[name] = { get value() { return geti(name); }, set value(v) { seti(name, v); } });
            //      })(name => super[name], (name, value) => super[name] = value);
            //      return __awaiter(this, arguments, Promise, function *() {
            //          [_super("a").value, _super("b").value] = yield ar;
            //      });
            //  }
            //  ...
            //
            // This helper creates an object with a "value" property that wraps the `super` property or indexed access for both get and set.
            // This is required for destructuring assignments, as a call expression cannot be used as the target of a destructuring assignment
            // while a property access can.
            if (container.kind === 144 /* MethodDeclaration */ && container.flags & 256 /* Async */) {
                if (ts.isSuperPropertyOrElementAccess(node.parent) && isAssignmentTarget(node.parent)) {
                    getNodeLinks(container).flags |= 4096 /* AsyncMethodWithSuperBinding */;
                }
                else {
                    getNodeLinks(container).flags |= 2048 /* AsyncMethodWithSuper */;
                }
            }
            if (needToCaptureLexicalThis) {
                // call expressions are allowed only in constructors so they should always capture correct 'this'
                // super property access expressions can also appear in arrow functions -
                // in this case they should also use correct lexical this
                captureLexicalThis(node.parent, container);
            }
            if (container.parent.kind === 168 /* ObjectLiteralExpression */) {
                if (languageVersion < 2 /* ES6 */) {
                    error(node, ts.Diagnostics.super_is_only_allowed_in_members_of_object_literal_expressions_when_option_target_is_ES2015_or_higher);
                    return unknownType;
                }
                else {
                    // for object literal assume that type of 'super' is 'any'
                    return anyType;
                }
            }
            // at this point the only legal case for parent is ClassLikeDeclaration
            var classLikeDeclaration = container.parent;
            var classType = getDeclaredTypeOfSymbol(getSymbolOfNode(classLikeDeclaration));
            var baseClassType = classType && getBaseTypes(classType)[0];
            if (!baseClassType) {
                if (!ts.getClassExtendsHeritageClauseElement(classLikeDeclaration)) {
                    error(node, ts.Diagnostics.super_can_only_be_referenced_in_a_derived_class);
                }
                return unknownType;
            }
            if (container.kind === 145 /* Constructor */ && isInConstructorArgumentInitializer(node, container)) {
                // issue custom error message for super property access in constructor arguments (to be aligned with old compiler)
                error(node, ts.Diagnostics.super_cannot_be_referenced_in_constructor_arguments);
                return unknownType;
            }
            return nodeCheckFlag === 512 /* SuperStatic */
                ? getBaseConstructorTypeOfClass(classType)
                : baseClassType;
            function isLegalUsageOfSuperExpression(container) {
                if (!container) {
                    return false;
                }
                if (isCallExpression) {
                    // TS 1.0 SPEC (April 2014): 4.8.1
                    // Super calls are only permitted in constructors of derived classes
                    return container.kind === 145 /* Constructor */;
                }
                else {
                    // TS 1.0 SPEC (April 2014)
                    // 'super' property access is allowed
                    // - In a constructor, instance member function, instance member accessor, or instance member variable initializer where this references a derived class instance
                    // - In a static member function or static member accessor
                    // topmost container must be something that is directly nested in the class declaration\object literal expression
                    if (ts.isClassLike(container.parent) || container.parent.kind === 168 /* ObjectLiteralExpression */) {
                        if (container.flags & 64 /* Static */) {
                            return container.kind === 144 /* MethodDeclaration */ ||
                                container.kind === 143 /* MethodSignature */ ||
                                container.kind === 146 /* GetAccessor */ ||
                                container.kind === 147 /* SetAccessor */;
                        }
                        else {
                            return container.kind === 144 /* MethodDeclaration */ ||
                                container.kind === 143 /* MethodSignature */ ||
                                container.kind === 146 /* GetAccessor */ ||
                                container.kind === 147 /* SetAccessor */ ||
                                container.kind === 142 /* PropertyDeclaration */ ||
                                container.kind === 141 /* PropertySignature */ ||
                                container.kind === 145 /* Constructor */;
                        }
                    }
                }
                return false;
            }
        }
        // Return contextual type of parameter or undefined if no contextual type is available
        function getContextuallyTypedParameterType(parameter) {
            var func = parameter.parent;
            if (isFunctionExpressionOrArrowFunction(func) || ts.isObjectLiteralMethod(func)) {
                if (isContextSensitive(func)) {
                    var contextualSignature = getContextualSignature(func);
                    if (contextualSignature) {
                        var funcHasRestParameters = ts.hasRestParameter(func);
                        var len = func.parameters.length - (funcHasRestParameters ? 1 : 0);
                        var indexOfParameter = ts.indexOf(func.parameters, parameter);
                        if (indexOfParameter < len) {
                            return getTypeAtPosition(contextualSignature, indexOfParameter);
                        }
                        // If last parameter is contextually rest parameter get its type
                        if (funcHasRestParameters &&
                            indexOfParameter === (func.parameters.length - 1) &&
                            isRestParameterIndex(contextualSignature, func.parameters.length - 1)) {
                            return getTypeOfSymbol(ts.lastOrUndefined(contextualSignature.parameters));
                        }
                    }
                }
            }
            return undefined;
        }
        // In a variable, parameter or property declaration with a type annotation, the contextual type of an initializer
        // expression is the type of the variable, parameter or property. Otherwise, in a parameter declaration of a
        // contextually typed function expression, the contextual type of an initializer expression is the contextual type
        // of the parameter. Otherwise, in a variable or parameter declaration with a binding pattern name, the contextual
        // type of an initializer expression is the type implied by the binding pattern.
        function getContextualTypeForInitializerExpression(node) {
            var declaration = node.parent;
            if (node === declaration.initializer) {
                if (declaration.type) {
                    return getTypeFromTypeNode(declaration.type);
                }
                if (declaration.kind === 139 /* Parameter */) {
                    var type = getContextuallyTypedParameterType(declaration);
                    if (type) {
                        return type;
                    }
                }
                if (ts.isBindingPattern(declaration.name)) {
                    return getTypeFromBindingPattern(declaration.name, /*includePatternInType*/ true);
                }
            }
            return undefined;
        }
        function getContextualTypeForReturnExpression(node) {
            var func = ts.getContainingFunction(node);
            if (func && !func.asteriskToken) {
                return getContextualReturnType(func);
            }
            return undefined;
        }
        function getContextualTypeForYieldOperand(node) {
            var func = ts.getContainingFunction(node);
            if (func) {
                var contextualReturnType = getContextualReturnType(func);
                if (contextualReturnType) {
                    return node.asteriskToken
                        ? contextualReturnType
                        : getElementTypeOfIterableIterator(contextualReturnType);
                }
            }
            return undefined;
        }
        function isInParameterInitializerBeforeContainingFunction(node) {
            while (node.parent && !ts.isFunctionLike(node.parent)) {
                if (node.parent.kind === 139 /* Parameter */ && node.parent.initializer === node) {
                    return true;
                }
                node = node.parent;
            }
            return false;
        }
        function getContextualReturnType(functionDecl) {
            // If the containing function has a return type annotation, is a constructor, or is a get accessor whose
            // corresponding set accessor has a type annotation, return statements in the function are contextually typed
            if (functionDecl.type ||
                functionDecl.kind === 145 /* Constructor */ ||
                functionDecl.kind === 146 /* GetAccessor */ && ts.getSetAccessorTypeAnnotationNode(ts.getDeclarationOfKind(functionDecl.symbol, 147 /* SetAccessor */))) {
                return getReturnTypeOfSignature(getSignatureFromDeclaration(functionDecl));
            }
            // Otherwise, if the containing function is contextually typed by a function type with exactly one call signature
            // and that call signature is non-generic, return statements are contextually typed by the return type of the signature
            var signature = getContextualSignatureForFunctionLikeDeclaration(functionDecl);
            if (signature) {
                return getReturnTypeOfSignature(signature);
            }
            return undefined;
        }
        // In a typed function call, an argument or substitution expression is contextually typed by the type of the corresponding parameter.
        function getContextualTypeForArgument(callTarget, arg) {
            var args = getEffectiveCallArguments(callTarget);
            var argIndex = ts.indexOf(args, arg);
            if (argIndex >= 0) {
                var signature = getResolvedSignature(callTarget);
                return getTypeAtPosition(signature, argIndex);
            }
            return undefined;
        }
        function getContextualTypeForSubstitutionExpression(template, substitutionExpression) {
            if (template.parent.kind === 173 /* TaggedTemplateExpression */) {
                return getContextualTypeForArgument(template.parent, substitutionExpression);
            }
            return undefined;
        }
        function getContextualTypeForBinaryOperand(node) {
            var binaryExpression = node.parent;
            var operator = binaryExpression.operatorToken.kind;
            if (operator >= 56 /* FirstAssignment */ && operator <= 68 /* LastAssignment */) {
                // In an assignment expression, the right operand is contextually typed by the type of the left operand.
                if (node === binaryExpression.right) {
                    return checkExpression(binaryExpression.left);
                }
            }
            else if (operator === 52 /* BarBarToken */) {
                // When an || expression has a contextual type, the operands are contextually typed by that type. When an ||
                // expression has no contextual type, the right operand is contextually typed by the type of the left operand.
                var type = getContextualType(binaryExpression);
                if (!type && node === binaryExpression.right) {
                    type = checkExpression(binaryExpression.left);
                }
                return type;
            }
            else if (operator === 51 /* AmpersandAmpersandToken */ || operator === 24 /* CommaToken */) {
                if (node === binaryExpression.right) {
                    return getContextualType(binaryExpression);
                }
            }
            return undefined;
        }
        // Apply a mapping function to a contextual type and return the resulting type. If the contextual type
        // is a union type, the mapping function is applied to each constituent type and a union of the resulting
        // types is returned.
        function applyToContextualType(type, mapper) {
            if (!(type.flags & 16384 /* Union */)) {
                return mapper(type);
            }
            var types = type.types;
            var mappedType;
            var mappedTypes;
            for (var _i = 0, types_8 = types; _i < types_8.length; _i++) {
                var current = types_8[_i];
                var t = mapper(current);
                if (t) {
                    if (!mappedType) {
                        mappedType = t;
                    }
                    else if (!mappedTypes) {
                        mappedTypes = [mappedType, t];
                    }
                    else {
                        mappedTypes.push(t);
                    }
                }
            }
            return mappedTypes ? getUnionType(mappedTypes) : mappedType;
        }
        function getTypeOfPropertyOfContextualType(type, name) {
            return applyToContextualType(type, function (t) {
                var prop = t.flags & 130048 /* StructuredType */ ? getPropertyOfType(t, name) : undefined;
                return prop ? getTypeOfSymbol(prop) : undefined;
            });
        }
        function getIndexTypeOfContextualType(type, kind) {
            return applyToContextualType(type, function (t) { return getIndexTypeOfStructuredType(t, kind); });
        }
        function contextualTypeIsStringLiteralType(type) {
            return !!(type.flags & 16384 /* Union */ ? ts.forEach(type.types, isStringLiteralType) : isStringLiteralType(type));
        }
        // Return true if the given contextual type is a tuple-like type
        function contextualTypeIsTupleLikeType(type) {
            return !!(type.flags & 16384 /* Union */ ? ts.forEach(type.types, isTupleLikeType) : isTupleLikeType(type));
        }
        // Return true if the given contextual type provides an index signature of the given kind
        function contextualTypeHasIndexSignature(type, kind) {
            return !!(type.flags & 16384 /* Union */ ? ts.forEach(type.types, function (t) { return getIndexTypeOfStructuredType(t, kind); }) : getIndexTypeOfStructuredType(type, kind));
        }
        // In an object literal contextually typed by a type T, the contextual type of a property assignment is the type of
        // the matching property in T, if one exists. Otherwise, it is the type of the numeric index signature in T, if one
        // exists. Otherwise, it is the type of the string index signature in T, if one exists.
        function getContextualTypeForObjectLiteralMethod(node) {
            ts.Debug.assert(ts.isObjectLiteralMethod(node));
            if (isInsideWithStatementBody(node)) {
                // We cannot answer semantic questions within a with block, do not proceed any further
                return undefined;
            }
            return getContextualTypeForObjectLiteralElement(node);
        }
        function getContextualTypeForObjectLiteralElement(element) {
            var objectLiteral = element.parent;
            var type = getApparentTypeOfContextualType(objectLiteral);
            if (type) {
                if (!ts.hasDynamicName(element)) {
                    // For a (non-symbol) computed property, there is no reason to look up the name
                    // in the type. It will just be "__computed", which does not appear in any
                    // SymbolTable.
                    var symbolName = getSymbolOfNode(element).name;
                    var propertyType = getTypeOfPropertyOfContextualType(type, symbolName);
                    if (propertyType) {
                        return propertyType;
                    }
                }
                return isNumericName(element.name) && getIndexTypeOfContextualType(type, 1 /* Number */) ||
                    getIndexTypeOfContextualType(type, 0 /* String */);
            }
            return undefined;
        }
        // In an array literal contextually typed by a type T, the contextual type of an element expression at index N is
        // the type of the property with the numeric name N in T, if one exists. Otherwise, if T has a numeric index signature,
        // it is the type of the numeric index signature in T. Otherwise, in ES6 and higher, the contextual type is the iterated
        // type of T.
        function getContextualTypeForElementExpression(node) {
            var arrayLiteral = node.parent;
            var type = getApparentTypeOfContextualType(arrayLiteral);
            if (type) {
                var index = ts.indexOf(arrayLiteral.elements, node);
                return getTypeOfPropertyOfContextualType(type, "" + index)
                    || getIndexTypeOfContextualType(type, 1 /* Number */)
                    || (languageVersion >= 2 /* ES6 */ ? getElementTypeOfIterable(type, /*errorNode*/ undefined) : undefined);
            }
            return undefined;
        }
        // In a contextually typed conditional expression, the true/false expressions are contextually typed by the same type.
        function getContextualTypeForConditionalOperand(node) {
            var conditional = node.parent;
            return node === conditional.whenTrue || node === conditional.whenFalse ? getContextualType(conditional) : undefined;
        }
        function getContextualTypeForJsxAttribute(attribute) {
            var kind = attribute.kind;
            var jsxElement = attribute.parent;
            var attrsType = getJsxElementAttributesType(jsxElement);
            if (attribute.kind === 241 /* JsxAttribute */) {
                if (!attrsType || isTypeAny(attrsType)) {
                    return undefined;
                }
                return getTypeOfPropertyOfType(attrsType, attribute.name.text);
            }
            else if (attribute.kind === 242 /* JsxSpreadAttribute */) {
                return attrsType;
            }
            ts.Debug.fail("Expected JsxAttribute or JsxSpreadAttribute, got ts.SyntaxKind[" + kind + "]");
        }
        // Return the contextual type for a given expression node. During overload resolution, a contextual type may temporarily
        // be "pushed" onto a node using the contextualType property.
        function getApparentTypeOfContextualType(node) {
            var type = getContextualType(node);
            return type && getApparentType(type);
        }
        /**
         * Woah! Do you really want to use this function?
         *
         * Unless you're trying to get the *non-apparent* type for a
         * value-literal type or you're authoring relevant portions of this algorithm,
         * you probably meant to use 'getApparentTypeOfContextualType'.
         * Otherwise this may not be very useful.
         *
         * In cases where you *are* working on this function, you should understand
         * when it is appropriate to use 'getContextualType' and 'getApparentTypeOfContetxualType'.
         *
         *   - Use 'getContextualType' when you are simply going to propagate the result to the expression.
         *   - Use 'getApparentTypeOfContextualType' when you're going to need the members of the type.
         *
         * @param node the expression whose contextual type will be returned.
         * @returns the contextual type of an expression.
         */
        function getContextualType(node) {
            if (isInsideWithStatementBody(node)) {
                // We cannot answer semantic questions within a with block, do not proceed any further
                return undefined;
            }
            if (node.contextualType) {
                return node.contextualType;
            }
            var parent = node.parent;
            switch (parent.kind) {
                case 214 /* VariableDeclaration */:
                case 139 /* Parameter */:
                case 142 /* PropertyDeclaration */:
                case 141 /* PropertySignature */:
                case 166 /* BindingElement */:
                    return getContextualTypeForInitializerExpression(node);
                case 177 /* ArrowFunction */:
                case 207 /* ReturnStatement */:
                    return getContextualTypeForReturnExpression(node);
                case 187 /* YieldExpression */:
                    return getContextualTypeForYieldOperand(parent);
                case 171 /* CallExpression */:
                case 172 /* NewExpression */:
                    return getContextualTypeForArgument(parent, node);
                case 174 /* TypeAssertionExpression */:
                case 192 /* AsExpression */:
                    return getTypeFromTypeNode(parent.type);
                case 184 /* BinaryExpression */:
                    return getContextualTypeForBinaryOperand(node);
                case 248 /* PropertyAssignment */:
                    return getContextualTypeForObjectLiteralElement(parent);
                case 167 /* ArrayLiteralExpression */:
                    return getContextualTypeForElementExpression(node);
                case 185 /* ConditionalExpression */:
                    return getContextualTypeForConditionalOperand(node);
                case 193 /* TemplateSpan */:
                    ts.Debug.assert(parent.parent.kind === 186 /* TemplateExpression */);
                    return getContextualTypeForSubstitutionExpression(parent.parent, node);
                case 175 /* ParenthesizedExpression */:
                    return getContextualType(parent);
                case 243 /* JsxExpression */:
                    return getContextualType(parent);
                case 241 /* JsxAttribute */:
                case 242 /* JsxSpreadAttribute */:
                    return getContextualTypeForJsxAttribute(parent);
            }
            return undefined;
        }
        // If the given type is an object or union type, if that type has a single signature, and if
        // that signature is non-generic, return the signature. Otherwise return undefined.
        function getNonGenericSignature(type) {
            var signatures = getSignaturesOfStructuredType(type, 0 /* Call */);
            if (signatures.length === 1) {
                var signature = signatures[0];
                if (!signature.typeParameters) {
                    return signature;
                }
            }
        }
        function isFunctionExpressionOrArrowFunction(node) {
            return node.kind === 176 /* FunctionExpression */ || node.kind === 177 /* ArrowFunction */;
        }
        function getContextualSignatureForFunctionLikeDeclaration(node) {
            // Only function expressions, arrow functions, and object literal methods are contextually typed.
            return isFunctionExpressionOrArrowFunction(node) || ts.isObjectLiteralMethod(node)
                ? getContextualSignature(node)
                : undefined;
        }
        // Return the contextual signature for a given expression node. A contextual type provides a
        // contextual signature if it has a single call signature and if that call signature is non-generic.
        // If the contextual type is a union type, get the signature from each type possible and if they are
        // all identical ignoring their return type, the result is same signature but with return type as
        // union type of return types from these signatures
        function getContextualSignature(node) {
            ts.Debug.assert(node.kind !== 144 /* MethodDeclaration */ || ts.isObjectLiteralMethod(node));
            var type = ts.isObjectLiteralMethod(node)
                ? getContextualTypeForObjectLiteralMethod(node)
                : getApparentTypeOfContextualType(node);
            if (!type) {
                return undefined;
            }
            if (!(type.flags & 16384 /* Union */)) {
                return getNonGenericSignature(type);
            }
            var signatureList;
            var types = type.types;
            for (var _i = 0, types_9 = types; _i < types_9.length; _i++) {
                var current = types_9[_i];
                var signature = getNonGenericSignature(current);
                if (signature) {
                    if (!signatureList) {
                        // This signature will contribute to contextual union signature
                        signatureList = [signature];
                    }
                    else if (!compareSignaturesIdentical(signatureList[0], signature, /*partialMatch*/ false, /*ignoreReturnTypes*/ true, compareTypesIdentical)) {
                        // Signatures aren't identical, do not use
                        return undefined;
                    }
                    else {
                        // Use this signature for contextual union signature
                        signatureList.push(signature);
                    }
                }
            }
            // Result is union of signatures collected (return type is union of return types of this signature set)
            var result;
            if (signatureList) {
                result = cloneSignature(signatureList[0]);
                // Clear resolved return type we possibly got from cloneSignature
                result.resolvedReturnType = undefined;
                result.unionSignatures = signatureList;
            }
            return result;
        }
        /**
         * Detect if the mapper implies an inference context. Specifically, there are 4 possible values
         * for a mapper. Let's go through each one of them:
         *
         *    1. undefined - this means we are not doing inferential typing, but we may do contextual typing,
         *       which could cause us to assign a parameter a type
         *    2. identityMapper - means we want to avoid assigning a parameter a type, whether or not we are in
         *       inferential typing (context is undefined for the identityMapper)
         *    3. a mapper created by createInferenceMapper - we are doing inferential typing, we want to assign
         *       types to parameters and fix type parameters (context is defined)
         *    4. an instantiation mapper created by createTypeMapper or createTypeEraser - this should never be
         *       passed as the contextual mapper when checking an expression (context is undefined for these)
         *
         * isInferentialContext is detecting if we are in case 3
         */
        function isInferentialContext(mapper) {
            return mapper && mapper.context;
        }
        // A node is an assignment target if it is on the left hand side of an '=' token, if it is parented by a property
        // assignment in an object literal that is an assignment target, or if it is parented by an array literal that is
        // an assignment target. Examples include 'a = xxx', '{ p: a } = xxx', '[{ p: a}] = xxx'.
        function isAssignmentTarget(node) {
            var parent = node.parent;
            if (parent.kind === 184 /* BinaryExpression */ && parent.operatorToken.kind === 56 /* EqualsToken */ && parent.left === node) {
                return true;
            }
            if (parent.kind === 248 /* PropertyAssignment */) {
                return isAssignmentTarget(parent.parent);
            }
            if (parent.kind === 167 /* ArrayLiteralExpression */) {
                return isAssignmentTarget(parent);
            }
            return false;
        }
        function checkSpreadElementExpression(node, contextualMapper) {
            // It is usually not safe to call checkExpressionCached if we can be contextually typing.
            // You can tell that we are contextually typing because of the contextualMapper parameter.
            // While it is true that a spread element can have a contextual type, it does not do anything
            // with this type. It is neither affected by it, nor does it propagate it to its operand.
            // So the fact that contextualMapper is passed is not important, because the operand of a spread
            // element is not contextually typed.
            var arrayOrIterableType = checkExpressionCached(node.expression, contextualMapper);
            return checkIteratedTypeOrElementType(arrayOrIterableType, node.expression, /*allowStringInput*/ false);
        }
        function hasDefaultValue(node) {
            return (node.kind === 166 /* BindingElement */ && !!node.initializer) ||
                (node.kind === 184 /* BinaryExpression */ && node.operatorToken.kind === 56 /* EqualsToken */);
        }
        function checkArrayLiteral(node, contextualMapper) {
            var elements = node.elements;
            var hasSpreadElement = false;
            var elementTypes = [];
            var inDestructuringPattern = isAssignmentTarget(node);
            for (var _i = 0, elements_1 = elements; _i < elements_1.length; _i++) {
                var e = elements_1[_i];
                if (inDestructuringPattern && e.kind === 188 /* SpreadElementExpression */) {
                    // Given the following situation:
                    //    var c: {};
                    //    [...c] = ["", 0];
                    //
                    // c is represented in the tree as a spread element in an array literal.
                    // But c really functions as a rest element, and its purpose is to provide
                    // a contextual type for the right hand side of the assignment. Therefore,
                    // instead of calling checkExpression on "...c", which will give an error
                    // if c is not iterable/array-like, we need to act as if we are trying to
                    // get the contextual element type from it. So we do something similar to
                    // getContextualTypeForElementExpression, which will crucially not error
                    // if there is no index type / iterated type.
                    var restArrayType = checkExpression(e.expression, contextualMapper);
                    var restElementType = getIndexTypeOfType(restArrayType, 1 /* Number */) ||
                        (languageVersion >= 2 /* ES6 */ ? getElementTypeOfIterable(restArrayType, /*errorNode*/ undefined) : undefined);
                    if (restElementType) {
                        elementTypes.push(restElementType);
                    }
                }
                else {
                    var type = checkExpression(e, contextualMapper);
                    elementTypes.push(type);
                }
                hasSpreadElement = hasSpreadElement || e.kind === 188 /* SpreadElementExpression */;
            }
            if (!hasSpreadElement) {
                // If array literal is actually a destructuring pattern, mark it as an implied type. We do this such
                // that we get the same behavior for "var [x, y] = []" and "[x, y] = []".
                if (inDestructuringPattern && elementTypes.length) {
                    var type = createNewTupleType(elementTypes);
                    type.pattern = node;
                    return type;
                }
                var contextualType = getApparentTypeOfContextualType(node);
                if (contextualType && contextualTypeIsTupleLikeType(contextualType)) {
                    var pattern = contextualType.pattern;
                    // If array literal is contextually typed by a binding pattern or an assignment pattern, pad the resulting
                    // tuple type with the corresponding binding or assignment element types to make the lengths equal.
                    if (pattern && (pattern.kind === 165 /* ArrayBindingPattern */ || pattern.kind === 167 /* ArrayLiteralExpression */)) {
                        var patternElements = pattern.elements;
                        for (var i = elementTypes.length; i < patternElements.length; i++) {
                            var patternElement = patternElements[i];
                            if (hasDefaultValue(patternElement)) {
                                elementTypes.push(contextualType.elementTypes[i]);
                            }
                            else {
                                if (patternElement.kind !== 190 /* OmittedExpression */) {
                                    error(patternElement, ts.Diagnostics.Initializer_provides_no_value_for_this_binding_element_and_the_binding_element_has_no_default_value);
                                }
                                elementTypes.push(unknownType);
                            }
                        }
                    }
                    if (elementTypes.length) {
                        return createTupleType(elementTypes);
                    }
                }
            }
            return createArrayType(elementTypes.length ? getUnionType(elementTypes) : undefinedType);
        }
        function isNumericName(name) {
            return name.kind === 137 /* ComputedPropertyName */ ? isNumericComputedName(name) : isNumericLiteralName(name.text);
        }
        function isNumericComputedName(name) {
            // It seems odd to consider an expression of type Any to result in a numeric name,
            // but this behavior is consistent with checkIndexedAccess
            return isTypeAnyOrAllConstituentTypesHaveKind(checkComputedPropertyName(name), 132 /* NumberLike */);
        }
        function isTypeAnyOrAllConstituentTypesHaveKind(type, kind) {
            return isTypeAny(type) || allConstituentTypesHaveKind(type, kind);
        }
        function isNumericLiteralName(name) {
            // The intent of numeric names is that
            //     - they are names with text in a numeric form, and that
            //     - setting properties/indexing with them is always equivalent to doing so with the numeric literal 'numLit',
            //         acquired by applying the abstract 'ToNumber' operation on the name's text.
            //
            // The subtlety is in the latter portion, as we cannot reliably say that anything that looks like a numeric literal is a numeric name.
            // In fact, it is the case that the text of the name must be equal to 'ToString(numLit)' for this to hold.
            //
            // Consider the property name '"0xF00D"'. When one indexes with '0xF00D', they are actually indexing with the value of 'ToString(0xF00D)'
            // according to the ECMAScript specification, so it is actually as if the user indexed with the string '"61453"'.
            // Thus, the text of all numeric literals equivalent to '61543' such as '0xF00D', '0xf00D', '0170015', etc. are not valid numeric names
            // because their 'ToString' representation is not equal to their original text.
            // This is motivated by ECMA-262 sections 9.3.1, 9.8.1, 11.1.5, and 11.2.1.
            //
            // Here, we test whether 'ToString(ToNumber(name))' is exactly equal to 'name'.
            // The '+' prefix operator is equivalent here to applying the abstract ToNumber operation.
            // Applying the 'toString()' method on a number gives us the abstract ToString operation on a number.
            //
            // Note that this accepts the values 'Infinity', '-Infinity', and 'NaN', and that this is intentional.
            // This is desired behavior, because when indexing with them as numeric entities, you are indexing
            // with the strings '"Infinity"', '"-Infinity"', and '"NaN"' respectively.
            return (+name).toString() === name;
        }
        function checkComputedPropertyName(node) {
            var links = getNodeLinks(node.expression);
            if (!links.resolvedType) {
                links.resolvedType = checkExpression(node.expression);
                // This will allow types number, string, symbol or any. It will also allow enums, the unknown
                // type, and any union of these types (like string | number).
                if (!isTypeAnyOrAllConstituentTypesHaveKind(links.resolvedType, 132 /* NumberLike */ | 258 /* StringLike */ | 16777216 /* ESSymbol */)) {
                    error(node, ts.Diagnostics.A_computed_property_name_must_be_of_type_string_number_symbol_or_any);
                }
                else {
                    checkThatExpressionIsProperSymbolReference(node.expression, links.resolvedType, /*reportError*/ true);
                }
            }
            return links.resolvedType;
        }
        function checkObjectLiteral(node, contextualMapper) {
            var inDestructuringPattern = isAssignmentTarget(node);
            // Grammar checking
            checkGrammarObjectLiteralExpression(node, inDestructuringPattern);
            var propertiesTable = {};
            var propertiesArray = [];
            var contextualType = getApparentTypeOfContextualType(node);
            var contextualTypeHasPattern = contextualType && contextualType.pattern &&
                (contextualType.pattern.kind === 164 /* ObjectBindingPattern */ || contextualType.pattern.kind === 168 /* ObjectLiteralExpression */);
            var typeFlags = 0;
            var patternWithComputedProperties = false;
            for (var _i = 0, _a = node.properties; _i < _a.length; _i++) {
                var memberDecl = _a[_i];
                var member = memberDecl.symbol;
                if (memberDecl.kind === 248 /* PropertyAssignment */ ||
                    memberDecl.kind === 249 /* ShorthandPropertyAssignment */ ||
                    ts.isObjectLiteralMethod(memberDecl)) {
                    var type = void 0;
                    if (memberDecl.kind === 248 /* PropertyAssignment */) {
                        type = checkPropertyAssignment(memberDecl, contextualMapper);
                    }
                    else if (memberDecl.kind === 144 /* MethodDeclaration */) {
                        type = checkObjectLiteralMethod(memberDecl, contextualMapper);
                    }
                    else {
                        ts.Debug.assert(memberDecl.kind === 249 /* ShorthandPropertyAssignment */);
                        type = checkExpression(memberDecl.name, contextualMapper);
                    }
                    typeFlags |= type.flags;
                    var prop = createSymbol(4 /* Property */ | 67108864 /* Transient */ | member.flags, member.name);
                    if (inDestructuringPattern) {
                        // If object literal is an assignment pattern and if the assignment pattern specifies a default value
                        // for the property, make the property optional.
                        var isOptional = (memberDecl.kind === 248 /* PropertyAssignment */ && hasDefaultValue(memberDecl.initializer)) ||
                            (memberDecl.kind === 249 /* ShorthandPropertyAssignment */ && memberDecl.objectAssignmentInitializer);
                        if (isOptional) {
                            prop.flags |= 536870912 /* Optional */;
                        }
                        if (ts.hasDynamicName(memberDecl)) {
                            patternWithComputedProperties = true;
                        }
                    }
                    else if (contextualTypeHasPattern && !(contextualType.flags & 67108864 /* ObjectLiteralPatternWithComputedProperties */)) {
                        // If object literal is contextually typed by the implied type of a binding pattern, and if the
                        // binding pattern specifies a default value for the property, make the property optional.
                        var impliedProp = getPropertyOfType(contextualType, member.name);
                        if (impliedProp) {
                            prop.flags |= impliedProp.flags & 536870912 /* Optional */;
                        }
                        else if (!compilerOptions.suppressExcessPropertyErrors) {
                            error(memberDecl.name, ts.Diagnostics.Object_literal_may_only_specify_known_properties_and_0_does_not_exist_in_type_1, symbolToString(member), typeToString(contextualType));
                        }
                    }
                    prop.declarations = member.declarations;
                    prop.parent = member.parent;
                    if (member.valueDeclaration) {
                        prop.valueDeclaration = member.valueDeclaration;
                    }
                    prop.type = type;
                    prop.target = member;
                    member = prop;
                }
                else {
                    // TypeScript 1.0 spec (April 2014)
                    // A get accessor declaration is processed in the same manner as
                    // an ordinary function declaration(section 6.1) with no parameters.
                    // A set accessor declaration is processed in the same manner
                    // as an ordinary function declaration with a single parameter and a Void return type.
                    ts.Debug.assert(memberDecl.kind === 146 /* GetAccessor */ || memberDecl.kind === 147 /* SetAccessor */);
                    checkAccessorDeclaration(memberDecl);
                }
                if (!ts.hasDynamicName(memberDecl)) {
                    propertiesTable[member.name] = member;
                }
                propertiesArray.push(member);
            }
            // If object literal is contextually typed by the implied type of a binding pattern, augment the result
            // type with those properties for which the binding pattern specifies a default value.
            if (contextualTypeHasPattern) {
                for (var _b = 0, _c = getPropertiesOfType(contextualType); _b < _c.length; _b++) {
                    var prop = _c[_b];
                    if (!ts.hasProperty(propertiesTable, prop.name)) {
                        if (!(prop.flags & 536870912 /* Optional */)) {
                            error(prop.valueDeclaration || prop.bindingElement, ts.Diagnostics.Initializer_provides_no_value_for_this_binding_element_and_the_binding_element_has_no_default_value);
                        }
                        propertiesTable[prop.name] = prop;
                        propertiesArray.push(prop);
                    }
                }
            }
            var stringIndexType = getIndexType(0 /* String */);
            var numberIndexType = getIndexType(1 /* Number */);
            var result = createAnonymousType(node.symbol, propertiesTable, emptyArray, emptyArray, stringIndexType, numberIndexType);
            var freshObjectLiteralFlag = compilerOptions.suppressExcessPropertyErrors ? 0 : 1048576 /* FreshObjectLiteral */;
            result.flags |= 524288 /* ObjectLiteral */ | 4194304 /* ContainsObjectLiteral */ | freshObjectLiteralFlag | (typeFlags & 14680064 /* PropagatingFlags */) | (patternWithComputedProperties ? 67108864 /* ObjectLiteralPatternWithComputedProperties */ : 0);
            if (inDestructuringPattern) {
                result.pattern = node;
            }
            return result;
            function getIndexType(kind) {
                if (contextualType && contextualTypeHasIndexSignature(contextualType, kind)) {
                    var propTypes = [];
                    for (var i = 0; i < propertiesArray.length; i++) {
                        var propertyDecl = node.properties[i];
                        if (kind === 0 /* String */ || isNumericName(propertyDecl.name)) {
                            // Do not call getSymbolOfNode(propertyDecl), as that will get the
                            // original symbol for the node. We actually want to get the symbol
                            // created by checkObjectLiteral, since that will be appropriately
                            // contextually typed and resolved.
                            var type = getTypeOfSymbol(propertiesArray[i]);
                            if (!ts.contains(propTypes, type)) {
                                propTypes.push(type);
                            }
                        }
                    }
                    var result_1 = propTypes.length ? getUnionType(propTypes) : undefinedType;
                    typeFlags |= result_1.flags;
                    return result_1;
                }
                return undefined;
            }
        }
        function checkJsxSelfClosingElement(node) {
            checkJsxOpeningLikeElement(node);
            return jsxElementType || anyType;
        }
        function checkJsxElement(node) {
            // Check attributes
            checkJsxOpeningLikeElement(node.openingElement);
            // Perform resolution on the closing tag so that rename/go to definition/etc work
            getJsxElementTagSymbol(node.closingElement);
            // Check children
            for (var _i = 0, _a = node.children; _i < _a.length; _i++) {
                var child = _a[_i];
                switch (child.kind) {
                    case 243 /* JsxExpression */:
                        checkJsxExpression(child);
                        break;
                    case 236 /* JsxElement */:
                        checkJsxElement(child);
                        break;
                    case 237 /* JsxSelfClosingElement */:
                        checkJsxSelfClosingElement(child);
                        break;
                }
            }
            return jsxElementType || anyType;
        }
        /**
         * Returns true iff the JSX element name would be a valid JS identifier, ignoring restrictions about keywords not being identifiers
         */
        function isUnhyphenatedJsxName(name) {
            // - is the only character supported in JSX attribute names that isn't valid in JavaScript identifiers
            return name.indexOf("-") < 0;
        }
        /**
         * Returns true iff React would emit this tag name as a string rather than an identifier or qualified name
         */
        function isJsxIntrinsicIdentifier(tagName) {
            if (tagName.kind === 136 /* QualifiedName */) {
                return false;
            }
            else {
                return ts.isIntrinsicJsxName(tagName.text);
            }
        }
        function checkJsxAttribute(node, elementAttributesType, nameTable) {
            var correspondingPropType = undefined;
            // Look up the corresponding property for this attribute
            if (elementAttributesType === emptyObjectType && isUnhyphenatedJsxName(node.name.text)) {
                // If there is no 'props' property, you may not have non-"data-" attributes
                error(node.parent, ts.Diagnostics.JSX_element_class_does_not_support_attributes_because_it_does_not_have_a_0_property, getJsxElementPropertiesName());
            }
            else if (elementAttributesType && !isTypeAny(elementAttributesType)) {
                var correspondingPropSymbol = getPropertyOfType(elementAttributesType, node.name.text);
                correspondingPropType = correspondingPropSymbol && getTypeOfSymbol(correspondingPropSymbol);
                if (isUnhyphenatedJsxName(node.name.text)) {
                    // Maybe there's a string indexer?
                    var indexerType = getIndexTypeOfType(elementAttributesType, 0 /* String */);
                    if (indexerType) {
                        correspondingPropType = indexerType;
                    }
                    else {
                        // If there's no corresponding property with this name, error
                        if (!correspondingPropType) {
                            error(node.name, ts.Diagnostics.Property_0_does_not_exist_on_type_1, node.name.text, typeToString(elementAttributesType));
                            return unknownType;
                        }
                    }
                }
            }
            var exprType;
            if (node.initializer) {
                exprType = checkExpression(node.initializer);
            }
            else {
                // <Elem attr /> is sugar for <Elem attr={true} />
                exprType = booleanType;
            }
            if (correspondingPropType) {
                checkTypeAssignableTo(exprType, correspondingPropType, node);
            }
            nameTable[node.name.text] = true;
            return exprType;
        }
        function checkJsxSpreadAttribute(node, elementAttributesType, nameTable) {
            var type = checkExpression(node.expression);
            var props = getPropertiesOfType(type);
            for (var _i = 0, props_2 = props; _i < props_2.length; _i++) {
                var prop = props_2[_i];
                // Is there a corresponding property in the element attributes type? Skip checking of properties
                // that have already been assigned to, as these are not actually pushed into the resulting type
                if (!nameTable[prop.name]) {
                    var targetPropSym = getPropertyOfType(elementAttributesType, prop.name);
                    if (targetPropSym) {
                        var msg = ts.chainDiagnosticMessages(undefined, ts.Diagnostics.Property_0_of_JSX_spread_attribute_is_not_assignable_to_target_property, prop.name);
                        checkTypeAssignableTo(getTypeOfSymbol(prop), getTypeOfSymbol(targetPropSym), node, undefined, msg);
                    }
                    nameTable[prop.name] = true;
                }
            }
            return type;
        }
        function getJsxType(name) {
            if (jsxTypes[name] === undefined) {
                return jsxTypes[name] = getExportedTypeFromNamespace(JsxNames.JSX, name) || unknownType;
            }
            return jsxTypes[name];
        }
        /// Given a JSX opening element or self-closing element, return the symbol of the property that the tag name points to if
        /// this is an intrinsic tag. This might be a named
        /// property of the IntrinsicElements interface, or its string indexer.
        /// If this is a class-based tag (otherwise returns undefined), returns the symbol of the class
        /// type or factory function.
        /// Otherwise, returns unknownSymbol.
        function getJsxElementTagSymbol(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedSymbol) {
                if (isJsxIntrinsicIdentifier(node.tagName)) {
                    links.resolvedSymbol = lookupIntrinsicTag(node);
                }
                else {
                    links.resolvedSymbol = lookupClassTag(node);
                }
            }
            return links.resolvedSymbol;
            function lookupIntrinsicTag(node) {
                var intrinsicElementsType = getJsxType(JsxNames.IntrinsicElements);
                if (intrinsicElementsType !== unknownType) {
                    // Property case
                    var intrinsicProp = getPropertyOfType(intrinsicElementsType, node.tagName.text);
                    if (intrinsicProp) {
                        links.jsxFlags |= 1 /* IntrinsicNamedElement */;
                        return intrinsicProp;
                    }
                    // Intrinsic string indexer case
                    var indexSignatureType = getIndexTypeOfType(intrinsicElementsType, 0 /* String */);
                    if (indexSignatureType) {
                        links.jsxFlags |= 2 /* IntrinsicIndexedElement */;
                        return intrinsicElementsType.symbol;
                    }
                    // Wasn't found
                    error(node, ts.Diagnostics.Property_0_does_not_exist_on_type_1, node.tagName.text, "JSX." + JsxNames.IntrinsicElements);
                    return unknownSymbol;
                }
                else {
                    if (compilerOptions.noImplicitAny) {
                        error(node, ts.Diagnostics.JSX_element_implicitly_has_type_any_because_no_interface_JSX_0_exists, JsxNames.IntrinsicElements);
                    }
                    return unknownSymbol;
                }
            }
            function lookupClassTag(node) {
                var valueSymbol = resolveJsxTagName(node);
                // Look up the value in the current scope
                if (valueSymbol && valueSymbol !== unknownSymbol) {
                    links.jsxFlags |= 4 /* ValueElement */;
                    if (valueSymbol.flags & 8388608 /* Alias */) {
                        markAliasSymbolAsReferenced(valueSymbol);
                    }
                }
                return valueSymbol || unknownSymbol;
            }
            function resolveJsxTagName(node) {
                if (node.tagName.kind === 69 /* Identifier */) {
                    var tag = node.tagName;
                    var sym = getResolvedSymbol(tag);
                    return sym.exportSymbol || sym;
                }
                else {
                    return checkQualifiedName(node.tagName).symbol;
                }
            }
        }
        /**
         * Given a JSX element that is a class element, finds the Element Instance Type. If the
         * element is not a class element, or the class element type cannot be determined, returns 'undefined'.
         * For example, in the element <MyClass>, the element instance type is `MyClass` (not `typeof MyClass`).
         */
        function getJsxElementInstanceType(node) {
            // There is no such thing as an instance type for a non-class element. This
            // line shouldn't be hit.
            ts.Debug.assert(!!(getNodeLinks(node).jsxFlags & 4 /* ValueElement */), "Should not call getJsxElementInstanceType on non-class Element");
            var classSymbol = getJsxElementTagSymbol(node);
            if (classSymbol === unknownSymbol) {
                // Couldn't find the class instance type. Error has already been issued
                return anyType;
            }
            var valueType = getTypeOfSymbol(classSymbol);
            if (isTypeAny(valueType)) {
                // Short-circuit if the class tag is using an element type 'any'
                return anyType;
            }
            // Resolve the signatures, preferring constructors
            var signatures = getSignaturesOfType(valueType, 1 /* Construct */);
            if (signatures.length === 0) {
                // No construct signatures, try call signatures
                signatures = getSignaturesOfType(valueType, 0 /* Call */);
                if (signatures.length === 0) {
                    // We found no signatures at all, which is an error
                    error(node.tagName, ts.Diagnostics.JSX_element_type_0_does_not_have_any_construct_or_call_signatures, ts.getTextOfNode(node.tagName));
                    return unknownType;
                }
            }
            return getUnionType(signatures.map(getReturnTypeOfSignature));
        }
        /// e.g. "props" for React.d.ts,
        /// or 'undefined' if ElementAttributesPropery doesn't exist (which means all
        ///     non-intrinsic elements' attributes type is 'any'),
        /// or '' if it has 0 properties (which means every
        ///     non-instrinsic elements' attributes type is the element instance type)
        function getJsxElementPropertiesName() {
            // JSX
            var jsxNamespace = getGlobalSymbol(JsxNames.JSX, 1536 /* Namespace */, /*diagnosticMessage*/ undefined);
            // JSX.ElementAttributesProperty [symbol]
            var attribsPropTypeSym = jsxNamespace && getSymbol(jsxNamespace.exports, JsxNames.ElementAttributesPropertyNameContainer, 793056 /* Type */);
            // JSX.ElementAttributesProperty [type]
            var attribPropType = attribsPropTypeSym && getDeclaredTypeOfSymbol(attribsPropTypeSym);
            // The properites of JSX.ElementAttributesProperty
            var attribProperties = attribPropType && getPropertiesOfType(attribPropType);
            if (attribProperties) {
                // Element Attributes has zero properties, so the element attributes type will be the class instance type
                if (attribProperties.length === 0) {
                    return "";
                }
                else if (attribProperties.length === 1) {
                    return attribProperties[0].name;
                }
                else {
                    error(attribsPropTypeSym.declarations[0], ts.Diagnostics.The_global_type_JSX_0_may_not_have_more_than_one_property, JsxNames.ElementAttributesPropertyNameContainer);
                    return undefined;
                }
            }
            else {
                // No interface exists, so the element attributes type will be an implicit any
                return undefined;
            }
        }
        /**
         * Given an opening/self-closing element, get the 'element attributes type', i.e. the type that tells
         * us which attributes are valid on a given element.
         */
        function getJsxElementAttributesType(node) {
            var links = getNodeLinks(node);
            if (!links.resolvedJsxType) {
                var sym = getJsxElementTagSymbol(node);
                if (links.jsxFlags & 4 /* ValueElement */) {
                    // Get the element instance type (the result of newing or invoking this tag)
                    var elemInstanceType = getJsxElementInstanceType(node);
                    var elemClassType = getJsxGlobalElementClassType();
                    if (!elemClassType || !isTypeAssignableTo(elemInstanceType, elemClassType)) {
                        // Is this is a stateless function component? See if its single signature's return type is
                        // assignable to the JSX Element Type
                        var elemType = getTypeOfSymbol(sym);
                        var callSignatures = elemType && getSignaturesOfType(elemType, 0 /* Call */);
                        var callSignature = callSignatures && callSignatures.length > 0 && callSignatures[0];
                        var callReturnType = callSignature && getReturnTypeOfSignature(callSignature);
                        var paramType = callReturnType && (callSignature.parameters.length === 0 ? emptyObjectType : getTypeOfSymbol(callSignature.parameters[0]));
                        if (callReturnType && isTypeAssignableTo(callReturnType, jsxElementType)) {
                            // Intersect in JSX.IntrinsicAttributes if it exists
                            var intrinsicAttributes = getJsxType(JsxNames.IntrinsicAttributes);
                            if (intrinsicAttributes !== unknownType) {
                                paramType = intersectTypes(intrinsicAttributes, paramType);
                            }
                            return links.resolvedJsxType = paramType;
                        }
                    }
                    // Issue an error if this return type isn't assignable to JSX.ElementClass
                    if (elemClassType) {
                        checkTypeRelatedTo(elemInstanceType, elemClassType, assignableRelation, node, ts.Diagnostics.JSX_element_type_0_is_not_a_constructor_function_for_JSX_elements);
                    }
                    if (isTypeAny(elemInstanceType)) {
                        return links.resolvedJsxType = elemInstanceType;
                    }
                    var propsName = getJsxElementPropertiesName();
                    if (propsName === undefined) {
                        // There is no type ElementAttributesProperty, return 'any'
                        return links.resolvedJsxType = anyType;
                    }
                    else if (propsName === "") {
                        // If there is no e.g. 'props' member in ElementAttributesProperty, use the element class type instead
                        return links.resolvedJsxType = elemInstanceType;
                    }
                    else {
                        var attributesType = getTypeOfPropertyOfType(elemInstanceType, propsName);
                        if (!attributesType) {
                            // There is no property named 'props' on this instance type
                            return links.resolvedJsxType = emptyObjectType;
                        }
                        else if (isTypeAny(attributesType) || (attributesType === unknownType)) {
                            // Props is of type 'any' or unknown
                            return links.resolvedJsxType = attributesType;
                        }
                        else if (attributesType.flags & 16384 /* Union */) {
                            // Props cannot be a union type
                            error(node.tagName, ts.Diagnostics.JSX_element_attributes_type_0_may_not_be_a_union_type, typeToString(attributesType));
                            return links.resolvedJsxType = anyType;
                        }
                        else {
                            // Normal case -- add in IntrinsicClassElements<T> and IntrinsicElements
                            var apparentAttributesType = attributesType;
                            var intrinsicClassAttribs = getJsxType(JsxNames.IntrinsicClassAttributes);
                            if (intrinsicClassAttribs !== unknownType) {
                                var typeParams = getLocalTypeParametersOfClassOrInterfaceOrTypeAlias(intrinsicClassAttribs.symbol);
                                if (typeParams) {
                                    if (typeParams.length === 1) {
                                        apparentAttributesType = intersectTypes(createTypeReference(intrinsicClassAttribs, [elemInstanceType]), apparentAttributesType);
                                    }
                                }
                                else {
                                    apparentAttributesType = intersectTypes(attributesType, intrinsicClassAttribs);
                                }
                            }
                            var intrinsicAttribs = getJsxType(JsxNames.IntrinsicAttributes);
                            if (intrinsicAttribs !== unknownType) {
                                apparentAttributesType = intersectTypes(intrinsicAttribs, apparentAttributesType);
                            }
                            return links.resolvedJsxType = apparentAttributesType;
                        }
                    }
                }
                else if (links.jsxFlags & 1 /* IntrinsicNamedElement */) {
                    return links.resolvedJsxType = getTypeOfSymbol(sym);
                }
                else if (links.jsxFlags & 2 /* IntrinsicIndexedElement */) {
                    return links.resolvedJsxType = getIndexTypeOfSymbol(sym, 0 /* String */);
                }
                else {
                    // Resolution failed, so we don't know
                    return links.resolvedJsxType = anyType;
                }
            }
            return links.resolvedJsxType;
        }
        /**
         * Given a JSX attribute, returns the symbol for the corresponds property
         * of the element attributes type. Will return unknownSymbol for attributes
         * that have no matching element attributes type property.
         */
        function getJsxAttributePropertySymbol(attrib) {
            var attributesType = getJsxElementAttributesType(attrib.parent);
            var prop = getPropertyOfType(attributesType, attrib.name.text);
            return prop || unknownSymbol;
        }
        function getJsxGlobalElementClassType() {
            if (!jsxElementClassType) {
                jsxElementClassType = getExportedTypeFromNamespace(JsxNames.JSX, JsxNames.ElementClass);
            }
            return jsxElementClassType;
        }
        /// Returns all the properties of the Jsx.IntrinsicElements interface
        function getJsxIntrinsicTagNames() {
            var intrinsics = getJsxType(JsxNames.IntrinsicElements);
            return intrinsics ? getPropertiesOfType(intrinsics) : emptyArray;
        }
        function checkJsxPreconditions(errorNode) {
            // Preconditions for using JSX
            if ((compilerOptions.jsx || 0 /* None */) === 0 /* None */) {
                error(errorNode, ts.Diagnostics.Cannot_use_JSX_unless_the_jsx_flag_is_provided);
            }
            if (jsxElementType === undefined) {
                if (compilerOptions.noImplicitAny) {
                    error(errorNode, ts.Diagnostics.JSX_element_implicitly_has_type_any_because_the_global_type_JSX_Element_does_not_exist);
                }
            }
        }
        function checkJsxOpeningLikeElement(node) {
            checkGrammarJsxElement(node);
            checkJsxPreconditions(node);
            // The reactNamespace symbol should be marked as 'used' so we don't incorrectly elide its import. And if there
            // is no reactNamespace symbol in scope when targeting React emit, we should issue an error.
            var reactRefErr = compilerOptions.jsx === 2 /* React */ ? ts.Diagnostics.Cannot_find_name_0 : undefined;
            var reactNamespace = compilerOptions.reactNamespace ? compilerOptions.reactNamespace : "React";
            var reactSym = resolveName(node.tagName, reactNamespace, 107455 /* Value */, reactRefErr, reactNamespace);
            if (reactSym) {
                getSymbolLinks(reactSym).referenced = true;
            }
            var targetAttributesType = getJsxElementAttributesType(node);
            var nameTable = {};
            // Process this array in right-to-left order so we know which
            // attributes (mostly from spreads) are being overwritten and
            // thus should have their types ignored
            var sawSpreadedAny = false;
            for (var i = node.attributes.length - 1; i >= 0; i--) {
                if (node.attributes[i].kind === 241 /* JsxAttribute */) {
                    checkJsxAttribute((node.attributes[i]), targetAttributesType, nameTable);
                }
                else {
                    ts.Debug.assert(node.attributes[i].kind === 242 /* JsxSpreadAttribute */);
                    var spreadType = checkJsxSpreadAttribute((node.attributes[i]), targetAttributesType, nameTable);
                    if (isTypeAny(spreadType)) {
                        sawSpreadedAny = true;
                    }
                }
            }
            // Check that all required properties have been provided. If an 'any'
            // was spreaded in, though, assume that it provided all required properties
            if (targetAttributesType && !sawSpreadedAny) {
                var targetProperties = getPropertiesOfType(targetAttributesType);
                for (var i = 0; i < targetProperties.length; i++) {
                    if (!(targetProperties[i].flags & 536870912 /* Optional */) &&
                        nameTable[targetProperties[i].name] === undefined) {
                        error(node, ts.Diagnostics.Property_0_is_missing_in_type_1, targetProperties[i].name, typeToString(targetAttributesType));
                    }
                }
            }
        }
        function checkJsxExpression(node) {
            if (node.expression) {
                return checkExpression(node.expression);
            }
            else {
                return unknownType;
            }
        }
        // If a symbol is a synthesized symbol with no value declaration, we assume it is a property. Example of this are the synthesized
        // '.prototype' property as well as synthesized tuple index properties.
        function getDeclarationKindFromSymbol(s) {
            return s.valueDeclaration ? s.valueDeclaration.kind : 142 /* PropertyDeclaration */;
        }
        function getDeclarationFlagsFromSymbol(s) {
            return s.valueDeclaration ? ts.getCombinedNodeFlags(s.valueDeclaration) : s.flags & 134217728 /* Prototype */ ? 8 /* Public */ | 64 /* Static */ : 0;
        }
        /**
         * Check whether the requested property access is valid.
         * Returns true if node is a valid property access, and false otherwise.
         * @param node The node to be checked.
         * @param left The left hand side of the property access (e.g.: the super in `super.foo`).
         * @param type The type of left.
         * @param prop The symbol for the right hand side of the property access.
         */
        function checkClassPropertyAccess(node, left, type, prop) {
            var flags = getDeclarationFlagsFromSymbol(prop);
            var declaringClass = getDeclaredTypeOfSymbol(getParentOfSymbol(prop));
            if (left.kind === 95 /* SuperKeyword */) {
                var errorNode = node.kind === 169 /* PropertyAccessExpression */ ?
                    node.name :
                    node.right;
                // TS 1.0 spec (April 2014): 4.8.2
                // - In a constructor, instance member function, instance member accessor, or
                //   instance member variable initializer where this references a derived class instance,
                //   a super property access is permitted and must specify a public instance member function of the base class.
                // - In a static member function or static member accessor
                //   where this references the constructor function object of a derived class,
                //   a super property access is permitted and must specify a public static member function of the base class.
                if (languageVersion < 2 /* ES6 */ && getDeclarationKindFromSymbol(prop) !== 144 /* MethodDeclaration */) {
                    // `prop` refers to a *property* declared in the super class
                    // rather than a *method*, so it does not satisfy the above criteria.
                    error(errorNode, ts.Diagnostics.Only_public_and_protected_methods_of_the_base_class_are_accessible_via_the_super_keyword);
                    return false;
                }
                if (flags & 128 /* Abstract */) {
                    // A method cannot be accessed in a super property access if the method is abstract.
                    // This error could mask a private property access error. But, a member
                    // cannot simultaneously be private and abstract, so this will trigger an
                    // additional error elsewhere.
                    error(errorNode, ts.Diagnostics.Abstract_method_0_in_class_1_cannot_be_accessed_via_super_expression, symbolToString(prop), typeToString(declaringClass));
                    return false;
                }
            }
            // Public properties are otherwise accessible.
            if (!(flags & (16 /* Private */ | 32 /* Protected */))) {
                return true;
            }
            // Property is known to be private or protected at this point
            // Get the declaring and enclosing class instance types
            var enclosingClassDeclaration = ts.getContainingClass(node);
            var enclosingClass = enclosingClassDeclaration ? getDeclaredTypeOfSymbol(getSymbolOfNode(enclosingClassDeclaration)) : undefined;
            // Private property is accessible if declaring and enclosing class are the same
            if (flags & 16 /* Private */) {
                if (declaringClass !== enclosingClass) {
                    error(node, ts.Diagnostics.Property_0_is_private_and_only_accessible_within_class_1, symbolToString(prop), typeToString(declaringClass));
                    return false;
                }
                return true;
            }
            // Property is known to be protected at this point
            // All protected properties of a supertype are accessible in a super access
            if (left.kind === 95 /* SuperKeyword */) {
                return true;
            }
            // A protected property is accessible in the declaring class and classes derived from it
            if (!enclosingClass || !hasBaseType(enclosingClass, declaringClass)) {
                error(node, ts.Diagnostics.Property_0_is_protected_and_only_accessible_within_class_1_and_its_subclasses, symbolToString(prop), typeToString(declaringClass));
                return false;
            }
            // No further restrictions for static properties
            if (flags & 64 /* Static */) {
                return true;
            }
            // An instance property must be accessed through an instance of the enclosing class
            if (type.flags & 33554432 /* ThisType */) {
                // get the original type -- represented as the type constraint of the 'this' type
                type = getConstraintOfTypeParameter(type);
            }
            // TODO: why is the first part of this check here?
            if (!(getTargetType(type).flags & (1024 /* Class */ | 2048 /* Interface */) && hasBaseType(type, enclosingClass))) {
                error(node, ts.Diagnostics.Property_0_is_protected_and_only_accessible_through_an_instance_of_class_1, symbolToString(prop), typeToString(enclosingClass));
                return false;
            }
            return true;
        }
        function checkPropertyAccessExpression(node) {
            return checkPropertyAccessExpressionOrQualifiedName(node, node.expression, node.name);
        }
        function checkQualifiedName(node) {
            return checkPropertyAccessExpressionOrQualifiedName(node, node.left, node.right);
        }
        function checkPropertyAccessExpressionOrQualifiedName(node, left, right) {
            var type = checkExpression(left);
            if (isTypeAny(type)) {
                return type;
            }
            var apparentType = getApparentType(getWidenedType(type));
            if (apparentType === unknownType) {
                // handle cases when type is Type parameter with invalid constraint
                return unknownType;
            }
            var prop = getPropertyOfType(apparentType, right.text);
            if (!prop) {
                if (right.text) {
                    error(right, ts.Diagnostics.Property_0_does_not_exist_on_type_1, ts.declarationNameToString(right), typeToString(type.flags & 33554432 /* ThisType */ ? apparentType : type));
                }
                return unknownType;
            }
            getNodeLinks(node).resolvedSymbol = prop;
            if (prop.parent && prop.parent.flags & 32 /* Class */) {
                checkClassPropertyAccess(node, left, apparentType, prop);
            }
            return getTypeOfSymbol(prop);
        }
        function isValidPropertyAccess(node, propertyName) {
            var left = node.kind === 169 /* PropertyAccessExpression */
                ? node.expression
                : node.left;
            var type = checkExpression(left);
            if (type !== unknownType && !isTypeAny(type)) {
                var prop = getPropertyOfType(getWidenedType(type), propertyName);
                if (prop && prop.parent && prop.parent.flags & 32 /* Class */) {
                    return checkClassPropertyAccess(node, left, type, prop);
                }
            }
            return true;
        }
        /**
         * Return the symbol of the for-in variable declared or referenced by the given for-in statement.
         */
        function getForInVariableSymbol(node) {
            var initializer = node.initializer;
            if (initializer.kind === 215 /* VariableDeclarationList */) {
                var variable = initializer.declarations[0];
                if (variable && !ts.isBindingPattern(variable.name)) {
                    return getSymbolOfNode(variable);
                }
            }
            else if (initializer.kind === 69 /* Identifier */) {
                return getResolvedSymbol(initializer);
            }
            return undefined;
        }
        /**
         * Return true if the given type is considered to have numeric property names.
         */
        function hasNumericPropertyNames(type) {
            return getIndexTypeOfType(type, 1 /* Number */) && !getIndexTypeOfType(type, 0 /* String */);
        }
        /**
         * Return true if given node is an expression consisting of an identifier (possibly parenthesized)
         * that references a for-in variable for an object with numeric property names.
         */
        function isForInVariableForNumericPropertyNames(expr) {
            var e = skipParenthesizedNodes(expr);
            if (e.kind === 69 /* Identifier */) {
                var symbol = getResolvedSymbol(e);
                if (symbol.flags & 3 /* Variable */) {
                    var child = expr;
                    var node = expr.parent;
                    while (node) {
                        if (node.kind === 203 /* ForInStatement */ &&
                            child === node.statement &&
                            getForInVariableSymbol(node) === symbol &&
                            hasNumericPropertyNames(checkExpression(node.expression))) {
                            return true;
                        }
                        child = node;
                        node = node.parent;
                    }
                }
            }
            return false;
        }
        function checkIndexedAccess(node) {
            // Grammar checking
            if (!node.argumentExpression) {
                var sourceFile = ts.getSourceFileOfNode(node);
                if (node.parent.kind === 172 /* NewExpression */ && node.parent.expression === node) {
                    var start = ts.skipTrivia(sourceFile.text, node.expression.end);
                    var end = node.end;
                    grammarErrorAtPos(sourceFile, start, end - start, ts.Diagnostics.new_T_cannot_be_used_to_create_an_array_Use_new_Array_T_instead);
                }
                else {
                    var start = node.end - "]".length;
                    var end = node.end;
                    grammarErrorAtPos(sourceFile, start, end - start, ts.Diagnostics.Expression_expected);
                }
            }
            // Obtain base constraint such that we can bail out if the constraint is an unknown type
            var objectType = getApparentType(checkExpression(node.expression));
            var indexType = node.argumentExpression ? checkExpression(node.argumentExpression) : unknownType;
            if (objectType === unknownType) {
                return unknownType;
            }
            var isConstEnum = isConstEnumObjectType(objectType);
            if (isConstEnum &&
                (!node.argumentExpression || node.argumentExpression.kind !== 9 /* StringLiteral */)) {
                error(node.argumentExpression, ts.Diagnostics.A_const_enum_member_can_only_be_accessed_using_a_string_literal);
                return unknownType;
            }
            // TypeScript 1.0 spec (April 2014): 4.10 Property Access
            // - If IndexExpr is a string literal or a numeric literal and ObjExpr's apparent type has a property with the name
            //    given by that literal(converted to its string representation in the case of a numeric literal), the property access is of the type of that property.
            // - Otherwise, if ObjExpr's apparent type has a numeric index signature and IndexExpr is of type Any, the Number primitive type, or an enum type,
            //    the property access is of the type of that index signature.
            // - Otherwise, if ObjExpr's apparent type has a string index signature and IndexExpr is of type Any, the String or Number primitive type, or an enum type,
            //    the property access is of the type of that index signature.
            // - Otherwise, if IndexExpr is of type Any, the String or Number primitive type, or an enum type, the property access is of type Any.
            // See if we can index as a property.
            if (node.argumentExpression) {
                var name_3 = getPropertyNameForIndexedAccess(node.argumentExpression, indexType);
                if (name_3 !== undefined) {
                    var prop = getPropertyOfType(objectType, name_3);
                    if (prop) {
                        getNodeLinks(node).resolvedSymbol = prop;
                        return getTypeOfSymbol(prop);
                    }
                    else if (isConstEnum) {
                        error(node.argumentExpression, ts.Diagnostics.Property_0_does_not_exist_on_const_enum_1, name_3, symbolToString(objectType.symbol));
                        return unknownType;
                    }
                }
            }
            // Check for compatible indexer types.
            if (isTypeAnyOrAllConstituentTypesHaveKind(indexType, 258 /* StringLike */ | 132 /* NumberLike */ | 16777216 /* ESSymbol */)) {
                // Try to use a number indexer.
                if (isTypeAnyOrAllConstituentTypesHaveKind(indexType, 132 /* NumberLike */) || isForInVariableForNumericPropertyNames(node.argumentExpression)) {
                    var numberIndexType = getIndexTypeOfType(objectType, 1 /* Number */);
                    if (numberIndexType) {
                        return numberIndexType;
                    }
                }
                // Try to use string indexing.
                var stringIndexType = getIndexTypeOfType(objectType, 0 /* String */);
                if (stringIndexType) {
                    return stringIndexType;
                }
                // Fall back to any.
                if (compilerOptions.noImplicitAny && !compilerOptions.suppressImplicitAnyIndexErrors && !isTypeAny(objectType)) {
                    error(node, getIndexTypeOfType(objectType, 1 /* Number */) ?
                        ts.Diagnostics.Element_implicitly_has_an_any_type_because_index_expression_is_not_of_type_number :
                        ts.Diagnostics.Index_signature_of_object_type_implicitly_has_an_any_type);
                }
                return anyType;
            }
            // REVIEW: Users should know the type that was actually used.
            error(node, ts.Diagnostics.An_index_expression_argument_must_be_of_type_string_number_symbol_or_any);
            return unknownType;
        }
        /**
         * If indexArgumentExpression is a string literal or number literal, returns its text.
         * If indexArgumentExpression is a constant value, returns its string value.
         * If indexArgumentExpression is a well known symbol, returns the property name corresponding
         *    to this symbol, as long as it is a proper symbol reference.
         * Otherwise, returns undefined.
         */
        function getPropertyNameForIndexedAccess(indexArgumentExpression, indexArgumentType) {
            if (indexArgumentExpression.kind === 9 /* StringLiteral */ || indexArgumentExpression.kind === 8 /* NumericLiteral */) {
                return indexArgumentExpression.text;
            }
            if (indexArgumentExpression.kind === 170 /* ElementAccessExpression */ || indexArgumentExpression.kind === 169 /* PropertyAccessExpression */) {
                var value = getConstantValue(indexArgumentExpression);
                if (value !== undefined) {
                    return value.toString();
                }
            }
            if (checkThatExpressionIsProperSymbolReference(indexArgumentExpression, indexArgumentType, /*reportError*/ false)) {
                var rightHandSideName = indexArgumentExpression.name.text;
                return ts.getPropertyNameForKnownSymbolName(rightHandSideName);
            }
            return undefined;
        }
        /**
         * A proper symbol reference requires the following:
         *   1. The property access denotes a property that exists
         *   2. The expression is of the form Symbol.<identifier>
         *   3. The property access is of the primitive type symbol.
         *   4. Symbol in this context resolves to the global Symbol object
         */
        function checkThatExpressionIsProperSymbolReference(expression, expressionType, reportError) {
            if (expressionType === unknownType) {
                // There is already an error, so no need to report one.
                return false;
            }
            if (!ts.isWellKnownSymbolSyntactically(expression)) {
                return false;
            }
            // Make sure the property type is the primitive symbol type
            if ((expressionType.flags & 16777216 /* ESSymbol */) === 0) {
                if (reportError) {
                    error(expression, ts.Diagnostics.A_computed_property_name_of_the_form_0_must_be_of_type_symbol, ts.getTextOfNode(expression));
                }
                return false;
            }
            // The name is Symbol.<someName>, so make sure Symbol actually resolves to the
            // global Symbol object
            var leftHandSide = expression.expression;
            var leftHandSideSymbol = getResolvedSymbol(leftHandSide);
            if (!leftHandSideSymbol) {
                return false;
            }
            var globalESSymbol = getGlobalESSymbolConstructorSymbol();
            if (!globalESSymbol) {
                // Already errored when we tried to look up the symbol
                return false;
            }
            if (leftHandSideSymbol !== globalESSymbol) {
                if (reportError) {
                    error(leftHandSide, ts.Diagnostics.Symbol_reference_does_not_refer_to_the_global_Symbol_constructor_object);
                }
                return false;
            }
            return true;
        }
        function resolveUntypedCall(node) {
            if (node.kind === 173 /* TaggedTemplateExpression */) {
                checkExpression(node.template);
            }
            else if (node.kind !== 140 /* Decorator */) {
                ts.forEach(node.arguments, function (argument) {
                    checkExpression(argument);
                });
            }
            return anySignature;
        }
        function resolveErrorCall(node) {
            resolveUntypedCall(node);
            return unknownSignature;
        }
        // Re-order candidate signatures into the result array. Assumes the result array to be empty.
        // The candidate list orders groups in reverse, but within a group signatures are kept in declaration order
        // A nit here is that we reorder only signatures that belong to the same symbol,
        // so order how inherited signatures are processed is still preserved.
        // interface A { (x: string): void }
        // interface B extends A { (x: 'foo'): string }
        // const b: B;
        // b('foo') // <- here overloads should be processed as [(x:'foo'): string, (x: string): void]
        function reorderCandidates(signatures, result) {
            var lastParent;
            var lastSymbol;
            var cutoffIndex = 0;
            var index;
            var specializedIndex = -1;
            var spliceIndex;
            ts.Debug.assert(!result.length);
            for (var _i = 0, signatures_2 = signatures; _i < signatures_2.length; _i++) {
                var signature = signatures_2[_i];
                var symbol = signature.declaration && getSymbolOfNode(signature.declaration);
                var parent_3 = signature.declaration && signature.declaration.parent;
                if (!lastSymbol || symbol === lastSymbol) {
                    if (lastParent && parent_3 === lastParent) {
                        index++;
                    }
                    else {
                        lastParent = parent_3;
                        index = cutoffIndex;
                    }
                }
                else {
                    // current declaration belongs to a different symbol
                    // set cutoffIndex so re-orderings in the future won't change result set from 0 to cutoffIndex
                    index = cutoffIndex = result.length;
                    lastParent = parent_3;
                }
                lastSymbol = symbol;
                // specialized signatures always need to be placed before non-specialized signatures regardless
                // of the cutoff position; see GH#1133
                if (signature.hasStringLiterals) {
                    specializedIndex++;
                    spliceIndex = specializedIndex;
                    // The cutoff index always needs to be greater than or equal to the specialized signature index
                    // in order to prevent non-specialized signatures from being added before a specialized
                    // signature.
                    cutoffIndex++;
                }
                else {
                    spliceIndex = index;
                }
                result.splice(spliceIndex, 0, signature);
            }
        }
        function getSpreadArgumentIndex(args) {
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                if (arg && arg.kind === 188 /* SpreadElementExpression */) {
                    return i;
                }
            }
            return -1;
        }
        function hasCorrectArity(node, args, signature) {
            var adjustedArgCount; // Apparent number of arguments we will have in this call
            var typeArguments; // Type arguments (undefined if none)
            var callIsIncomplete; // In incomplete call we want to be lenient when we have too few arguments
            var isDecorator;
            var spreadArgIndex = -1;
            if (node.kind === 173 /* TaggedTemplateExpression */) {
                var tagExpression = node;
                // Even if the call is incomplete, we'll have a missing expression as our last argument,
                // so we can say the count is just the arg list length
                adjustedArgCount = args.length;
                typeArguments = undefined;
                if (tagExpression.template.kind === 186 /* TemplateExpression */) {
                    // If a tagged template expression lacks a tail literal, the call is incomplete.
                    // Specifically, a template only can end in a TemplateTail or a Missing literal.
                    var templateExpression = tagExpression.template;
                    var lastSpan = ts.lastOrUndefined(templateExpression.templateSpans);
                    ts.Debug.assert(lastSpan !== undefined); // we should always have at least one span.
                    callIsIncomplete = ts.nodeIsMissing(lastSpan.literal) || !!lastSpan.literal.isUnterminated;
                }
                else {
                    // If the template didn't end in a backtick, or its beginning occurred right prior to EOF,
                    // then this might actually turn out to be a TemplateHead in the future;
                    // so we consider the call to be incomplete.
                    var templateLiteral = tagExpression.template;
                    ts.Debug.assert(templateLiteral.kind === 11 /* NoSubstitutionTemplateLiteral */);
                    callIsIncomplete = !!templateLiteral.isUnterminated;
                }
            }
            else if (node.kind === 140 /* Decorator */) {
                isDecorator = true;
                typeArguments = undefined;
                adjustedArgCount = getEffectiveArgumentCount(node, /*args*/ undefined, signature);
            }
            else {
                var callExpression = node;
                if (!callExpression.arguments) {
                    // This only happens when we have something of the form: 'new C'
                    ts.Debug.assert(callExpression.kind === 172 /* NewExpression */);
                    return signature.minArgumentCount === 0;
                }
                // For IDE scenarios we may have an incomplete call, so a trailing comma is tantamount to adding another argument.
                adjustedArgCount = callExpression.arguments.hasTrailingComma ? args.length + 1 : args.length;
                // If we are missing the close paren, the call is incomplete.
                callIsIncomplete = callExpression.arguments.end === callExpression.end;
                typeArguments = callExpression.typeArguments;
                spreadArgIndex = getSpreadArgumentIndex(args);
            }
            // If the user supplied type arguments, but the number of type arguments does not match
            // the declared number of type parameters, the call has an incorrect arity.
            var hasRightNumberOfTypeArgs = !typeArguments ||
                (signature.typeParameters && typeArguments.length === signature.typeParameters.length);
            if (!hasRightNumberOfTypeArgs) {
                return false;
            }
            // If spread arguments are present, check that they correspond to a rest parameter. If so, no
            // further checking is necessary.
            if (spreadArgIndex >= 0) {
                return isRestParameterIndex(signature, spreadArgIndex);
            }
            // Too many arguments implies incorrect arity.
            if (!signature.hasRestParameter && adjustedArgCount > signature.parameters.length) {
                return false;
            }
            // If the call is incomplete, we should skip the lower bound check.
            var hasEnoughArguments = adjustedArgCount >= signature.minArgumentCount;
            return callIsIncomplete || hasEnoughArguments;
        }
        // If type has a single call signature and no other members, return that signature. Otherwise, return undefined.
        function getSingleCallSignature(type) {
            if (type.flags & 80896 /* ObjectType */) {
                var resolved = resolveStructuredTypeMembers(type);
                if (resolved.callSignatures.length === 1 && resolved.constructSignatures.length === 0 &&
                    resolved.properties.length === 0 && !resolved.stringIndexType && !resolved.numberIndexType) {
                    return resolved.callSignatures[0];
                }
            }
            return undefined;
        }
        // Instantiate a generic signature in the context of a non-generic signature (section 3.8.5 in TypeScript spec)
        function instantiateSignatureInContextOf(signature, contextualSignature, contextualMapper) {
            var context = createInferenceContext(signature.typeParameters, /*inferUnionTypes*/ true);
            forEachMatchingParameterType(contextualSignature, signature, function (source, target) {
                // Type parameters from outer context referenced by source type are fixed by instantiation of the source type
                inferTypes(context, instantiateType(source, contextualMapper), target);
            });
            return getSignatureInstantiation(signature, getInferredTypes(context));
        }
        function inferTypeArguments(node, signature, args, excludeArgument, context) {
            var typeParameters = signature.typeParameters;
            var inferenceMapper = getInferenceMapper(context);
            // Clear out all the inference results from the last time inferTypeArguments was called on this context
            for (var i = 0; i < typeParameters.length; i++) {
                // As an optimization, we don't have to clear (and later recompute) inferred types
                // for type parameters that have already been fixed on the previous call to inferTypeArguments.
                // It would be just as correct to reset all of them. But then we'd be repeating the same work
                // for the type parameters that were fixed, namely the work done by getInferredType.
                if (!context.inferences[i].isFixed) {
                    context.inferredTypes[i] = undefined;
                }
            }
            // On this call to inferTypeArguments, we may get more inferences for certain type parameters that were not
            // fixed last time. This means that a type parameter that failed inference last time may succeed this time,
            // or vice versa. Therefore, the failedTypeParameterIndex is useless if it points to an unfixed type parameter,
            // because it may change. So here we reset it. However, getInferredType will not revisit any type parameters
            // that were previously fixed. So if a fixed type parameter failed previously, it will fail again because
            // it will contain the exact same set of inferences. So if we reset the index from a fixed type parameter,
            // we will lose information that we won't recover this time around.
            if (context.failedTypeParameterIndex !== undefined && !context.inferences[context.failedTypeParameterIndex].isFixed) {
                context.failedTypeParameterIndex = undefined;
            }
            // We perform two passes over the arguments. In the first pass we infer from all arguments, but use
            // wildcards for all context sensitive function expressions.
            var argCount = getEffectiveArgumentCount(node, args, signature);
            for (var i = 0; i < argCount; i++) {
                var arg = getEffectiveArgument(node, args, i);
                // If the effective argument is 'undefined', then it is an argument that is present but is synthetic.
                if (arg === undefined || arg.kind !== 190 /* OmittedExpression */) {
                    var paramType = getTypeAtPosition(signature, i);
                    var argType = getEffectiveArgumentType(node, i, arg);
                    // If the effective argument type is 'undefined', there is no synthetic type
                    // for the argument. In that case, we should check the argument.
                    if (argType === undefined) {
                        // For context sensitive arguments we pass the identityMapper, which is a signal to treat all
                        // context sensitive function expressions as wildcards
                        var mapper = excludeArgument && excludeArgument[i] !== undefined ? identityMapper : inferenceMapper;
                        argType = checkExpressionWithContextualType(arg, paramType, mapper);
                    }
                    inferTypes(context, argType, paramType);
                }
            }
            // In the second pass we visit only context sensitive arguments, and only those that aren't excluded, this
            // time treating function expressions normally (which may cause previously inferred type arguments to be fixed
            // as we construct types for contextually typed parameters)
            // Decorators will not have `excludeArgument`, as their arguments cannot be contextually typed.
            // Tagged template expressions will always have `undefined` for `excludeArgument[0]`.
            if (excludeArgument) {
                for (var i = 0; i < argCount; i++) {
                    // No need to check for omitted args and template expressions, their exlusion value is always undefined
                    if (excludeArgument[i] === false) {
                        var arg = args[i];
                        var paramType = getTypeAtPosition(signature, i);
                        inferTypes(context, checkExpressionWithContextualType(arg, paramType, inferenceMapper), paramType);
                    }
                }
            }
            getInferredTypes(context);
        }
        function checkTypeArguments(signature, typeArgumentNodes, typeArgumentTypes, reportErrors, headMessage) {
            var typeParameters = signature.typeParameters;
            var typeArgumentsAreAssignable = true;
            var mapper;
            for (var i = 0; i < typeParameters.length; i++) {
                if (typeArgumentsAreAssignable /* so far */) {
                    var constraint = getConstraintOfTypeParameter(typeParameters[i]);
                    if (constraint) {
                        var errorInfo = void 0;
                        var typeArgumentHeadMessage = ts.Diagnostics.Type_0_does_not_satisfy_the_constraint_1;
                        if (reportErrors && headMessage) {
                            errorInfo = ts.chainDiagnosticMessages(errorInfo, typeArgumentHeadMessage);
                            typeArgumentHeadMessage = headMessage;
                        }
                        if (!mapper) {
                            mapper = createTypeMapper(typeParameters, typeArgumentTypes);
                        }
                        var typeArgument = typeArgumentTypes[i];
                        typeArgumentsAreAssignable = checkTypeAssignableTo(typeArgument, getTypeWithThisArgument(instantiateType(constraint, mapper), typeArgument), reportErrors ? typeArgumentNodes[i] : undefined, typeArgumentHeadMessage, errorInfo);
                    }
                }
            }
            return typeArgumentsAreAssignable;
        }
        function checkApplicableSignature(node, args, signature, relation, excludeArgument, reportErrors) {
            var argCount = getEffectiveArgumentCount(node, args, signature);
            for (var i = 0; i < argCount; i++) {
                var arg = getEffectiveArgument(node, args, i);
                // If the effective argument is 'undefined', then it is an argument that is present but is synthetic.
                if (arg === undefined || arg.kind !== 190 /* OmittedExpression */) {
                    // Check spread elements against rest type (from arity check we know spread argument corresponds to a rest parameter)
                    var paramType = getTypeAtPosition(signature, i);
                    var argType = getEffectiveArgumentType(node, i, arg);
                    // If the effective argument type is 'undefined', there is no synthetic type
                    // for the argument. In that case, we should check the argument.
                    if (argType === undefined) {
                        argType = arg.kind === 9 /* StringLiteral */ && !reportErrors
                            ? getStringLiteralTypeForText(arg.text)
                            : checkExpressionWithContextualType(arg, paramType, excludeArgument && excludeArgument[i] ? identityMapper : undefined);
                    }
                    // Use argument expression as error location when reporting errors
                    var errorNode = reportErrors ? getEffectiveArgumentErrorNode(node, i, arg) : undefined;
                    var headMessage = ts.Diagnostics.Argument_of_type_0_is_not_assignable_to_parameter_of_type_1;
                    if (!checkTypeRelatedTo(argType, paramType, relation, errorNode, headMessage)) {
                        return false;
                    }
                }
            }
            return true;
        }
        /**
         * Returns the effective arguments for an expression that works like a function invocation.
         *
         * If 'node' is a CallExpression or a NewExpression, then its argument list is returned.
         * If 'node' is a TaggedTemplateExpression, a new argument list is constructed from the substitution
         *    expressions, where the first element of the list is `undefined`.
         * If 'node' is a Decorator, the argument list will be `undefined`, and its arguments and types
         *    will be supplied from calls to `getEffectiveArgumentCount` and `getEffectiveArgumentType`.
         */
        function getEffectiveCallArguments(node) {
            var args;
            if (node.kind === 173 /* TaggedTemplateExpression */) {
                var template = node.template;
                args = [undefined];
                if (template.kind === 186 /* TemplateExpression */) {
                    ts.forEach(template.templateSpans, function (span) {
                        args.push(span.expression);
                    });
                }
            }
            else if (node.kind === 140 /* Decorator */) {
                // For a decorator, we return undefined as we will determine
                // the number and types of arguments for a decorator using
                // `getEffectiveArgumentCount` and `getEffectiveArgumentType` below.
                return undefined;
            }
            else {
                args = node.arguments || emptyArray;
            }
            return args;
        }
        /**
          * Returns the effective argument count for a node that works like a function invocation.
          * If 'node' is a Decorator, the number of arguments is derived from the decoration
          *    target and the signature:
          *    If 'node.target' is a class declaration or class expression, the effective argument
          *       count is 1.
          *    If 'node.target' is a parameter declaration, the effective argument count is 3.
          *    If 'node.target' is a property declaration, the effective argument count is 2.
          *    If 'node.target' is a method or accessor declaration, the effective argument count
          *       is 3, although it can be 2 if the signature only accepts two arguments, allowing
          *       us to match a property decorator.
          * Otherwise, the argument count is the length of the 'args' array.
          */
        function getEffectiveArgumentCount(node, args, signature) {
            if (node.kind === 140 /* Decorator */) {
                switch (node.parent.kind) {
                    case 217 /* ClassDeclaration */:
                    case 189 /* ClassExpression */:
                        // A class decorator will have one argument (see `ClassDecorator` in core.d.ts)
                        return 1;
                    case 142 /* PropertyDeclaration */:
                        // A property declaration decorator will have two arguments (see
                        // `PropertyDecorator` in core.d.ts)
                        return 2;
                    case 144 /* MethodDeclaration */:
                    case 146 /* GetAccessor */:
                    case 147 /* SetAccessor */:
                        // A method or accessor declaration decorator will have two or three arguments (see
                        // `PropertyDecorator` and `MethodDecorator` in core.d.ts)
                        // If we are emitting decorators for ES3, we will only pass two arguments.
                        if (languageVersion === 0 /* ES3 */) {
                            return 2;
                        }
                        // If the method decorator signature only accepts a target and a key, we will only
                        // type check those arguments.
                        return signature.parameters.length >= 3 ? 3 : 2;
                    case 139 /* Parameter */:
                        // A parameter declaration decorator will have three arguments (see
                        // `ParameterDecorator` in core.d.ts)
                        return 3;
                }
            }
            else {
                return args.length;
            }
        }
        /**
          * Returns the effective type of the first argument to a decorator.
          * If 'node' is a class declaration or class expression, the effective argument type
          *    is the type of the static side of the class.
          * If 'node' is a parameter declaration, the effective argument type is either the type
          *    of the static or instance side of the class for the parameter's parent method,
          *    depending on whether the method is declared static.
          *    For a constructor, the type is always the type of the static side of the class.
          * If 'node' is a property, method, or accessor declaration, the effective argument
          *    type is the type of the static or instance side of the parent class for class
          *    element, depending on whether the element is declared static.
          */
        function getEffectiveDecoratorFirstArgumentType(node) {
            // The first argument to a decorator is its `target`.
            if (node.kind === 217 /* ClassDeclaration */) {
                // For a class decorator, the `target` is the type of the class (e.g. the
                // "static" or "constructor" side of the class)
                var classSymbol = getSymbolOfNode(node);
                return getTypeOfSymbol(classSymbol);
            }
            if (node.kind === 139 /* Parameter */) {
                // For a parameter decorator, the `target` is the parent type of the
                // parameter's containing method.
                node = node.parent;
                if (node.kind === 145 /* Constructor */) {
                    var classSymbol = getSymbolOfNode(node);
                    return getTypeOfSymbol(classSymbol);
                }
            }
            if (node.kind === 142 /* PropertyDeclaration */ ||
                node.kind === 144 /* MethodDeclaration */ ||
                node.kind === 146 /* GetAccessor */ ||
                node.kind === 147 /* SetAccessor */) {
                // For a property or method decorator, the `target` is the
                // "static"-side type of the parent of the member if the member is
                // declared "static"; otherwise, it is the "instance"-side type of the
                // parent of the member.
                return getParentTypeOfClassElement(node);
            }
            ts.Debug.fail("Unsupported decorator target.");
            return unknownType;
        }
        /**
          * Returns the effective type for the second argument to a decorator.
          * If 'node' is a parameter, its effective argument type is one of the following:
          *    If 'node.parent' is a constructor, the effective argument type is 'any', as we
          *       will emit `undefined`.
          *    If 'node.parent' is a member with an identifier, numeric, or string literal name,
          *       the effective argument type will be a string literal type for the member name.
          *    If 'node.parent' is a computed property name, the effective argument type will
          *       either be a symbol type or the string type.
          * If 'node' is a member with an identifier, numeric, or string literal name, the
          *    effective argument type will be a string literal type for the member name.
          * If 'node' is a computed property name, the effective argument type will either
          *    be a symbol type or the string type.
          * A class decorator does not have a second argument type.
          */
        function getEffectiveDecoratorSecondArgumentType(node) {
            // The second argument to a decorator is its `propertyKey`
            if (node.kind === 217 /* ClassDeclaration */) {
                ts.Debug.fail("Class decorators should not have a second synthetic argument.");
                return unknownType;
            }
            if (node.kind === 139 /* Parameter */) {
                node = node.parent;
                if (node.kind === 145 /* Constructor */) {
                    // For a constructor parameter decorator, the `propertyKey` will be `undefined`.
                    return anyType;
                }
            }
            if (node.kind === 142 /* PropertyDeclaration */ ||
                node.kind === 144 /* MethodDeclaration */ ||
                node.kind === 146 /* GetAccessor */ ||
                node.kind === 147 /* SetAccessor */) {
                // The `propertyKey` for a property or method decorator will be a
                // string literal type if the member name is an identifier, number, or string;
                // otherwise, if the member name is a computed property name it will
                // be either string or symbol.
                var element = node;
                switch (element.name.kind) {
                    case 69 /* Identifier */:
                    case 8 /* NumericLiteral */:
                    case 9 /* StringLiteral */:
                        return getStringLiteralTypeForText(element.name.text);
                    case 137 /* ComputedPropertyName */:
                        var nameType = checkComputedPropertyName(element.name);
                        if (allConstituentTypesHaveKind(nameType, 16777216 /* ESSymbol */)) {
                            return nameType;
                        }
                        else {
                            return stringType;
                        }
                    default:
                        ts.Debug.fail("Unsupported property name.");
                        return unknownType;
                }
            }
            ts.Debug.fail("Unsupported decorator target.");
            return unknownType;
        }
        /**
          * Returns the effective argument type for the third argument to a decorator.
          * If 'node' is a parameter, the effective argument type is the number type.
          * If 'node' is a method or accessor, the effective argument type is a
          *    `TypedPropertyDescriptor<T>` instantiated with the type of the member.
          * Class and property decorators do not have a third effective argument.
          */
        function getEffectiveDecoratorThirdArgumentType(node) {
            // The third argument to a decorator is either its `descriptor` for a method decorator
            // or its `parameterIndex` for a paramter decorator
            if (node.kind === 217 /* ClassDeclaration */) {
                ts.Debug.fail("Class decorators should not have a third synthetic argument.");
                return unknownType;
            }
            if (node.kind === 139 /* Parameter */) {
                // The `parameterIndex` for a parameter decorator is always a number
                return numberType;
            }
            if (node.kind === 142 /* PropertyDeclaration */) {
                ts.Debug.fail("Property decorators should not have a third synthetic argument.");
                return unknownType;
            }
            if (node.kind === 144 /* MethodDeclaration */ ||
                node.kind === 146 /* GetAccessor */ ||
                node.kind === 147 /* SetAccessor */) {
                // The `descriptor` for a method decorator will be a `TypedPropertyDescriptor<T>`
                // for the type of the member.
                var propertyType = getTypeOfNode(node);
                return createTypedPropertyDescriptorType(propertyType);
            }
            ts.Debug.fail("Unsupported decorator target.");
            return unknownType;
        }
        /**
          * Returns the effective argument type for the provided argument to a decorator.
          */
        function getEffectiveDecoratorArgumentType(node, argIndex) {
            if (argIndex === 0) {
                return getEffectiveDecoratorFirstArgumentType(node.parent);
            }
            else if (argIndex === 1) {
                return getEffectiveDecoratorSecondArgumentType(node.parent);
            }
            else if (argIndex === 2) {
                return getEffectiveDecoratorThirdArgumentType(node.parent);
            }
            ts.Debug.fail("Decorators should not have a fourth synthetic argument.");
            return unknownType;
        }
        /**
          * Gets the effective argument type for an argument in a call expression.
          */
        function getEffectiveArgumentType(node, argIndex, arg) {
            // Decorators provide special arguments, a tagged template expression provides
            // a special first argument, and string literals get string literal types
            // unless we're reporting errors
            if (node.kind === 140 /* Decorator */) {
                return getEffectiveDecoratorArgumentType(node, argIndex);
            }
            else if (argIndex === 0 && node.kind === 173 /* TaggedTemplateExpression */) {
                return globalTemplateStringsArrayType;
            }
            // This is not a synthetic argument, so we return 'undefined'
            // to signal that the caller needs to check the argument.
            return undefined;
        }
        /**
          * Gets the effective argument expression for an argument in a call expression.
          */
        function getEffectiveArgument(node, args, argIndex) {
            // For a decorator or the first argument of a tagged template expression we return undefined.
            if (node.kind === 140 /* Decorator */ ||
                (argIndex === 0 && node.kind === 173 /* TaggedTemplateExpression */)) {
                return undefined;
            }
            return args[argIndex];
        }
        /**
          * Gets the error node to use when reporting errors for an effective argument.
          */
        function getEffectiveArgumentErrorNode(node, argIndex, arg) {
            if (node.kind === 140 /* Decorator */) {
                // For a decorator, we use the expression of the decorator for error reporting.
                return node.expression;
            }
            else if (argIndex === 0 && node.kind === 173 /* TaggedTemplateExpression */) {
                // For a the first argument of a tagged template expression, we use the template of the tag for error reporting.
                return node.template;
            }
            else {
                return arg;
            }
        }
        function resolveCall(node, signatures, candidatesOutArray, headMessage) {
            var isTaggedTemplate = node.kind === 173 /* TaggedTemplateExpression */;
            var isDecorator = node.kind === 140 /* Decorator */;
            var typeArguments;
            if (!isTaggedTemplate && !isDecorator) {
                typeArguments = node.typeArguments;
                // We already perform checking on the type arguments on the class declaration itself.
                if (node.expression.kind !== 95 /* SuperKeyword */) {
                    ts.forEach(typeArguments, checkSourceElement);
                }
            }
            var candidates = candidatesOutArray || [];
            // reorderCandidates fills up the candidates array directly
            reorderCandidates(signatures, candidates);
            if (!candidates.length) {
                reportError(ts.Diagnostics.Supplied_parameters_do_not_match_any_signature_of_call_target);
                return resolveErrorCall(node);
            }
            var args = getEffectiveCallArguments(node);
            // The following applies to any value of 'excludeArgument[i]':
            //    - true:      the argument at 'i' is susceptible to a one-time permanent contextual typing.
            //    - undefined: the argument at 'i' is *not* susceptible to permanent contextual typing.
            //    - false:     the argument at 'i' *was* and *has been* permanently contextually typed.
            //
            // The idea is that we will perform type argument inference & assignability checking once
            // without using the susceptible parameters that are functions, and once more for each of those
            // parameters, contextually typing each as we go along.
            //
            // For a tagged template, then the first argument be 'undefined' if necessary
            // because it represents a TemplateStringsArray.
            //
            // For a decorator, no arguments are susceptible to contextual typing due to the fact
            // decorators are applied to a declaration by the emitter, and not to an expression.
            var excludeArgument;
            if (!isDecorator) {
                // We do not need to call `getEffectiveArgumentCount` here as it only
                // applies when calculating the number of arguments for a decorator.
                for (var i = isTaggedTemplate ? 1 : 0; i < args.length; i++) {
                    if (isContextSensitive(args[i])) {
                        if (!excludeArgument) {
                            excludeArgument = new Array(args.length);
                        }
                        excludeArgument[i] = true;
                    }
                }
            }
            // The following variables are captured and modified by calls to chooseOverload.
            // If overload resolution or type argument inference fails, we want to report the
            // best error possible. The best error is one which says that an argument was not
            // assignable to a parameter. This implies that everything else about the overload
            // was fine. So if there is any overload that is only incorrect because of an
            // argument, we will report an error on that one.
            //
            //     function foo(s: string) {}
            //     function foo(n: number) {} // Report argument error on this overload
            //     function foo() {}
            //     foo(true);
            //
            // If none of the overloads even made it that far, there are two possibilities.
            // There was a problem with type arguments for some overload, in which case
            // report an error on that. Or none of the overloads even had correct arity,
            // in which case give an arity error.
            //
            //     function foo<T>(x: T, y: T) {} // Report type argument inference error
            //     function foo() {}
            //     foo(0, true);
            //
            var candidateForArgumentError;
            var candidateForTypeArgumentError;
            var resultOfFailedInference;
            var result;
            // Section 4.12.1:
            // if the candidate list contains one or more signatures for which the type of each argument
            // expression is a subtype of each corresponding parameter type, the return type of the first
            // of those signatures becomes the return type of the function call.
            // Otherwise, the return type of the first signature in the candidate list becomes the return
            // type of the function call.
            //
            // Whether the call is an error is determined by assignability of the arguments. The subtype pass
            // is just important for choosing the best signature. So in the case where there is only one
            // signature, the subtype pass is useless. So skipping it is an optimization.
            if (candidates.length > 1) {
                result = chooseOverload(candidates, subtypeRelation);
            }
            if (!result) {
                // Reinitialize these pointers for round two
                candidateForArgumentError = undefined;
                candidateForTypeArgumentError = undefined;
                resultOfFailedInference = undefined;
                result = chooseOverload(candidates, assignableRelation);
            }
            if (result) {
                return result;
            }
            // No signatures were applicable. Now report errors based on the last applicable signature with
            // no arguments excluded from assignability checks.
            // If candidate is undefined, it means that no candidates had a suitable arity. In that case,
            // skip the checkApplicableSignature check.
            if (candidateForArgumentError) {
                // excludeArgument is undefined, in this case also equivalent to [undefined, undefined, ...]
                // The importance of excludeArgument is to prevent us from typing function expression parameters
                // in arguments too early. If possible, we'd like to only type them once we know the correct
                // overload. However, this matters for the case where the call is correct. When the call is
                // an error, we don't need to exclude any arguments, although it would cause no harm to do so.
                checkApplicableSignature(node, args, candidateForArgumentError, assignableRelation, /*excludeArgument*/ undefined, /*reportErrors*/ true);
            }
            else if (candidateForTypeArgumentError) {
                if (!isTaggedTemplate && !isDecorator && typeArguments) {
                    var typeArguments_2 = node.typeArguments;
                    checkTypeArguments(candidateForTypeArgumentError, typeArguments_2, ts.map(typeArguments_2, getTypeFromTypeNode), /*reportErrors*/ true, headMessage);
                }
                else {
                    ts.Debug.assert(resultOfFailedInference.failedTypeParameterIndex >= 0);
                    var failedTypeParameter = candidateForTypeArgumentError.typeParameters[resultOfFailedInference.failedTypeParameterIndex];
                    var inferenceCandidates = getInferenceCandidates(resultOfFailedInference, resultOfFailedInference.failedTypeParameterIndex);
                    var diagnosticChainHead = ts.chainDiagnosticMessages(/*details*/ undefined, // details will be provided by call to reportNoCommonSupertypeError
                    ts.Diagnostics.The_type_argument_for_type_parameter_0_cannot_be_inferred_from_the_usage_Consider_specifying_the_type_arguments_explicitly, typeToString(failedTypeParameter));
                    if (headMessage) {
                        diagnosticChainHead = ts.chainDiagnosticMessages(diagnosticChainHead, headMessage);
                    }
                    reportNoCommonSupertypeError(inferenceCandidates, node.expression || node.tag, diagnosticChainHead);
                }
            }
            else {
                reportError(ts.Diagnostics.Supplied_parameters_do_not_match_any_signature_of_call_target);
            }
            // No signature was applicable. We have already reported the errors for the invalid signature.
            // If this is a type resolution session, e.g. Language Service, try to get better information that anySignature.
            // Pick the first candidate that matches the arity. This way we can get a contextual type for cases like:
            //  declare function f(a: { xa: number; xb: number; });
            //  f({ |
            if (!produceDiagnostics) {
                for (var _i = 0, candidates_1 = candidates; _i < candidates_1.length; _i++) {
                    var candidate = candidates_1[_i];
                    if (hasCorrectArity(node, args, candidate)) {
                        if (candidate.typeParameters && typeArguments) {
                            candidate = getSignatureInstantiation(candidate, ts.map(typeArguments, getTypeFromTypeNode));
                        }
                        return candidate;
                    }
                }
            }
            return resolveErrorCall(node);
            function reportError(message, arg0, arg1, arg2) {
                var errorInfo;
                errorInfo = ts.chainDiagnosticMessages(errorInfo, message, arg0, arg1, arg2);
                if (headMessage) {
                    errorInfo = ts.chainDiagnosticMessages(errorInfo, headMessage);
                }
                diagnostics.add(ts.createDiagnosticForNodeFromMessageChain(node, errorInfo));
            }
            function chooseOverload(candidates, relation) {
                for (var _i = 0, candidates_2 = candidates; _i < candidates_2.length; _i++) {
                    var originalCandidate = candidates_2[_i];
                    if (!hasCorrectArity(node, args, originalCandidate)) {
                        continue;
                    }
                    var candidate = void 0;
                    var typeArgumentsAreValid = void 0;
                    var inferenceContext = originalCandidate.typeParameters
                        ? createInferenceContext(originalCandidate.typeParameters, /*inferUnionTypes*/ false)
                        : undefined;
                    while (true) {
                        candidate = originalCandidate;
                        if (candidate.typeParameters) {
                            var typeArgumentTypes = void 0;
                            if (typeArguments) {
                                typeArgumentTypes = ts.map(typeArguments, getTypeFromTypeNode);
                                typeArgumentsAreValid = checkTypeArguments(candidate, typeArguments, typeArgumentTypes, /*reportErrors*/ false);
                            }
                            else {
                                inferTypeArguments(node, candidate, args, excludeArgument, inferenceContext);
                                typeArgumentsAreValid = inferenceContext.failedTypeParameterIndex === undefined;
                                typeArgumentTypes = inferenceContext.inferredTypes;
                            }
                            if (!typeArgumentsAreValid) {
                                break;
                            }
                            candidate = getSignatureInstantiation(candidate, typeArgumentTypes);
                        }
                        if (!checkApplicableSignature(node, args, candidate, relation, excludeArgument, /*reportErrors*/ false)) {
                            break;
                        }
                        var index = excludeArgument ? ts.indexOf(excludeArgument, true) : -1;
                        if (index < 0) {
                            return candidate;
                        }
                        excludeArgument[index] = false;
                    }
                    // A post-mortem of this iteration of the loop. The signature was not applicable,
                    // so we want to track it as a candidate for reporting an error. If the candidate
                    // had no type parameters, or had no issues related to type arguments, we can
                    // report an error based on the arguments. If there was an issue with type
                    // arguments, then we can only report an error based on the type arguments.
                    if (originalCandidate.typeParameters) {
                        var instantiatedCandidate = candidate;
                        if (typeArgumentsAreValid) {
                            candidateForArgumentError = instantiatedCandidate;
                        }
                        else {
                            candidateForTypeArgumentError = originalCandidate;
                            if (!typeArguments) {
                                resultOfFailedInference = inferenceContext;
                            }
                        }
                    }
                    else {
                        ts.Debug.assert(originalCandidate === candidate);
                        candidateForArgumentError = originalCandidate;
                    }
                }
                return undefined;
            }
        }
        function resolveCallExpression(node, candidatesOutArray) {
            if (node.expression.kind === 95 /* SuperKeyword */) {
                var superType = checkSuperExpression(node.expression);
                if (superType !== unknownType) {
                    // In super call, the candidate signatures are the matching arity signatures of the base constructor function instantiated
                    // with the type arguments specified in the extends clause.
                    var baseTypeNode = ts.getClassExtendsHeritageClauseElement(ts.getContainingClass(node));
                    var baseConstructors = getInstantiatedConstructorsForTypeArguments(superType, baseTypeNode.typeArguments);
                    return resolveCall(node, baseConstructors, candidatesOutArray);
                }
                return resolveUntypedCall(node);
            }
            var funcType = checkExpression(node.expression);
            var apparentType = getApparentType(funcType);
            if (apparentType === unknownType) {
                // Another error has already been reported
                return resolveErrorCall(node);
            }
            // Technically, this signatures list may be incomplete. We are taking the apparent type,
            // but we are not including call signatures that may have been added to the Object or
            // Function interface, since they have none by default. This is a bit of a leap of faith
            // that the user will not add any.
            var callSignatures = getSignaturesOfType(apparentType, 0 /* Call */);
            var constructSignatures = getSignaturesOfType(apparentType, 1 /* Construct */);
            // TS 1.0 spec: 4.12
            // If FuncExpr is of type Any, or of an object type that has no call or construct signatures
            // but is a subtype of the Function interface, the call is an untyped function call. In an
            // untyped function call no TypeArgs are permitted, Args can be any argument list, no contextual
            // types are provided for the argument expressions, and the result is always of type Any.
            // We exclude union types because we may have a union of function types that happen to have
            // no common signatures.
            if (isTypeAny(funcType) || (!callSignatures.length && !constructSignatures.length && !(funcType.flags & 16384 /* Union */) && isTypeAssignableTo(funcType, globalFunctionType))) {
                // The unknownType indicates that an error already occured (and was reported).  No
                // need to report another error in this case.
                if (funcType !== unknownType && node.typeArguments) {
                    error(node, ts.Diagnostics.Untyped_function_calls_may_not_accept_type_arguments);
                }
                return resolveUntypedCall(node);
            }
            // If FuncExpr's apparent type(section 3.8.1) is a function type, the call is a typed function call.
            // TypeScript employs overload resolution in typed function calls in order to support functions
            // with multiple call signatures.
            if (!callSignatures.length) {
                if (constructSignatures.length) {
                    error(node, ts.Diagnostics.Value_of_type_0_is_not_callable_Did_you_mean_to_include_new, typeToString(funcType));
                }
                else {
                    error(node, ts.Diagnostics.Cannot_invoke_an_expression_whose_type_lacks_a_call_signature);
                }
                return resolveErrorCall(node);
            }
            return resolveCall(node, callSignatures, candidatesOutArray);
        }
        function resolveNewExpression(node, candidatesOutArray) {
            if (node.arguments && languageVersion < 1 /* ES5 */) {
                var spreadIndex = getSpreadArgumentIndex(node.arguments);
                if (spreadIndex >= 0) {
                    error(node.arguments[spreadIndex], ts.Diagnostics.Spread_operator_in_new_expressions_is_only_available_when_targeting_ECMAScript_5_and_higher);
                }
            }
            var expressionType = checkExpression(node.expression);
            // If expressionType's apparent type(section 3.8.1) is an object type with one or
            // more construct signatures, the expression is processed in the same manner as a
            // function call, but using the construct signatures as the initial set of candidate
            // signatures for overload resolution. The result type of the function call becomes
            // the result type of the operation.
            expressionType = getApparentType(expressionType);
            if (expressionType === unknownType) {
                // Another error has already been reported
                return resolveErrorCall(node);
            }
            // If the expression is a class of abstract type, then it cannot be instantiated.
            // Note, only class declarations can be declared abstract.
            // In the case of a merged class-module or class-interface declaration,
            // only the class declaration node will have the Abstract flag set.
            var valueDecl = expressionType.symbol && getClassLikeDeclarationOfSymbol(expressionType.symbol);
            if (valueDecl && valueDecl.flags & 128 /* Abstract */) {
                error(node, ts.Diagnostics.Cannot_create_an_instance_of_the_abstract_class_0, ts.declarationNameToString(valueDecl.name));
                return resolveErrorCall(node);
            }
            // TS 1.0 spec: 4.11
            // If expressionType is of type Any, Args can be any argument
            // list and the result of the operation is of type Any.
            if (isTypeAny(expressionType)) {
                if (node.typeArguments) {
                    error(node, ts.Diagnostics.Untyped_function_calls_may_not_accept_type_arguments);
                }
                return resolveUntypedCall(node);
            }
            // Technically, this signatures list may be incomplete. We are taking the apparent type,
            // but we are not including construct signatures that may have been added to the Object or
            // Function interface, since they have none by default. This is a bit of a leap of faith
            // that the user will not add any.
            var constructSignatures = getSignaturesOfType(expressionType, 1 /* Construct */);
            if (constructSignatures.length) {
                return resolveCall(node, constructSignatures, candidatesOutArray);
            }
            // If expressionType's apparent type is an object type with no construct signatures but
            // one or more call signatures, the expression is processed as a function call. A compile-time
            // error occurs if the result of the function call is not Void. The type of the result of the
            // operation is Any.
            var callSignatures = getSignaturesOfType(expressionType, 0 /* Call */);
            if (callSignatures.length) {
                var signature = resolveCall(node, callSignatures, candidatesOutArray);
                if (getReturnTypeOfSignature(signature) !== voidType) {
                    error(node, ts.Diagnostics.Only_a_void_function_can_be_called_with_the_new_keyword);
                }
                return signature;
            }
            error(node, ts.Diagnostics.Cannot_use_new_with_an_expression_whose_type_lacks_a_call_or_construct_signature);
            return resolveErrorCall(node);
        }
        function resolveTaggedTemplateExpression(node, candidatesOutArray) {
            var tagType = checkExpression(node.tag);
            var apparentType = getApparentType(tagType);
            if (apparentType === unknownType) {
                // Another error has already been reported
                return resolveErrorCall(node);
            }
            var callSignatures = getSignaturesOfType(apparentType, 0 /* Call */);
            if (isTypeAny(tagType) || (!callSignatures.length && !(tagType.flags & 16384 /* Union */) && isTypeAssignableTo(tagType, globalFunctionType))) {
                return resolveUntypedCall(node);
            }
            if (!callSignatures.length) {
                error(node, ts.Diagnostics.Cannot_invoke_an_expression_whose_type_lacks_a_call_signature);
                return resolveErrorCall(node);
            }
            return resolveCall(node, callSignatures, candidatesOutArray);
        }
        /**
          * Gets the localized diagnostic head message to use for errors when resolving a decorator as a call expression.
          */
        function getDiagnosticHeadMessageForDecoratorResolution(node) {
            switch (node.parent.kind) {
                case 217 /* ClassDeclaration */:
                case 189 /* ClassExpression */:
                    return ts.Diagnostics.Unable_to_resolve_signature_of_class_decorator_when_called_as_an_expression;
                case 139 /* Parameter */:
                    return ts.Diagnostics.Unable_to_resolve_signature_of_parameter_decorator_when_called_as_an_expression;
                case 142 /* PropertyDeclaration */:
                    return ts.Diagnostics.Unable_to_resolve_signature_of_property_decorator_when_called_as_an_expression;
                case 144 /* MethodDeclaration */:
                case 146 /* GetAccessor */:
                case 147 /* SetAccessor */:
                    return ts.Diagnostics.Unable_to_resolve_signature_of_method_decorator_when_called_as_an_expression;
            }
        }
        /**
          * Resolves a decorator as if it were a call expression.
          */
        function resolveDecorator(node, candidatesOutArray) {
            var funcType = checkExpression(node.expression);
            var apparentType = getApparentType(funcType);
            if (apparentType === unknownType) {
                return resolveErrorCall(node);
            }
            var callSignatures = getSignaturesOfType(apparentType, 0 /* Call */);
            if (funcType === anyType || (!callSignatures.length && !(funcType.flags & 16384 /* Union */) && isTypeAssignableTo(funcType, globalFunctionType))) {
                return resolveUntypedCall(node);
            }
            var headMessage = getDiagnosticHeadMessageForDecoratorResolution(node);
            if (!callSignatures.length) {
                var errorInfo = void 0;
                errorInfo = ts.chainDiagnosticMessages(errorInfo, ts.Diagnostics.Cannot_invoke_an_expression_whose_type_lacks_a_call_signature);
                errorInfo = ts.chainDiagnosticMessages(errorInfo, headMessage);
                diagnostics.add(ts.createDiagnosticForNodeFromMessageChain(node, errorInfo));
                return resolveErrorCall(node);
            }
            return resolveCall(node, callSignatures, candidatesOutArray, headMessage);
        }
        // candidatesOutArray is passed by signature help in the language service, and collectCandidates
        // must fill it up with the appropriate candidate signatures
        function getResolvedSignature(node, candidatesOutArray) {
            var links = getNodeLinks(node);
            // If getResolvedSignature has already been called, we will have cached the resolvedSignature.
            // However, it is possible that either candidatesOutArray was not passed in the first time,
            // or that a different candidatesOutArray was passed in. Therefore, we need to redo the work
            // to correctly fill the candidatesOutArray.
            if (!links.resolvedSignature || candidatesOutArray) {
                links.resolvedSignature = anySignature;
                if (node.kind === 171 /* CallExpression */) {
                    links.resolvedSignature = resolveCallExpression(node, candidatesOutArray);
                }
                else if (node.kind === 172 /* NewExpression */) {
                    links.resolvedSignature = resolveNewExpression(node, candidatesOutArray);
                }
                else if (node.kind === 173 /* TaggedTemplateExpression */) {
                    links.resolvedSignature = resolveTaggedTemplateExpression(node, candidatesOutArray);
                }
                else if (node.kind === 140 /* Decorator */) {
                    links.resolvedSignature = resolveDecorator(node, candidatesOutArray);
                }
                else {
                    ts.Debug.fail("Branch in 'getResolvedSignature' should be unreachable.");
                }
            }
            return links.resolvedSignature;
        }
        function getInferredClassType(symbol) {
            var links = getSymbolLinks(symbol);
            if (!links.inferredClassType) {
                links.inferredClassType = createAnonymousType(undefined, symbol.members, emptyArray, emptyArray, /*stringIndexType*/ undefined, /*numberIndexType*/ undefined);
            }
            return links.inferredClassType;
        }
        /**
         * Syntactically and semantically checks a call or new expression.
         * @param node The call/new expression to be checked.
         * @returns On success, the expression's signature's return type. On failure, anyType.
         */
        function checkCallExpression(node) {
            // Grammar checking; stop grammar-checking if checkGrammarTypeArguments return true
            checkGrammarTypeArguments(node, node.typeArguments) || checkGrammarArguments(node, node.arguments);
            var signature = getResolvedSignature(node);
            if (node.expression.kind === 95 /* SuperKeyword */) {
                return voidType;
            }
            if (node.kind === 172 /* NewExpression */) {
                var declaration = signature.declaration;
                if (declaration &&
                    declaration.kind !== 145 /* Constructor */ &&
                    declaration.kind !== 149 /* ConstructSignature */ &&
                    declaration.kind !== 154 /* ConstructorType */ &&
                    !ts.isJSDocConstructSignature(declaration)) {
                    // When resolved signature is a call signature (and not a construct signature) the result type is any, unless
                    // the declaring function had members created through 'x.prototype.y = expr' or 'this.y = expr' psuedodeclarations
                    // in a JS file
                    var funcSymbol = checkExpression(node.expression).symbol;
                    if (funcSymbol && funcSymbol.members && (funcSymbol.flags & 16 /* Function */)) {
                        return getInferredClassType(funcSymbol);
                    }
                    else if (compilerOptions.noImplicitAny) {
                        error(node, ts.Diagnostics.new_expression_whose_target_lacks_a_construct_signature_implicitly_has_an_any_type);
                    }
                    return anyType;
                }
            }
            // In JavaScript files, calls to any identifier 'require' are treated as external module imports
            if (ts.isInJavaScriptFile(node) && ts.isRequireCall(node, /*checkArgumentIsStringLiteral*/ true)) {
                return resolveExternalModuleTypeByLiteral(node.arguments[0]);
            }
            return getReturnTypeOfSignature(signature);
        }
        function checkTaggedTemplateExpression(node) {
            return getReturnTypeOfSignature(getResolvedSignature(node));
        }
        function checkAssertion(node) {
            var exprType = getRegularTypeOfObjectLiteral(checkExpression(node.expression));
            var targetType = getTypeFromTypeNode(node.type);
            if (produceDiagnostics && targetType !== unknownType) {
                var widenedType = getWidenedType(exprType);
                // Permit 'number[] | "foo"' to be asserted to 'string'.
                var bothAreStringLike = someConstituentTypeHasKind(targetType, 258 /* StringLike */) &&
                    someConstituentTypeHasKind(widenedType, 258 /* StringLike */);
                if (!bothAreStringLike && !(isTypeAssignableTo(targetType, widenedType))) {
                    checkTypeAssignableTo(exprType, targetType, node, ts.Diagnostics.Neither_type_0_nor_type_1_is_assignable_to_the_other);
                }
            }
            return targetType;
        }
        function getTypeAtPosition(signature, pos) {
            return signature.hasRestParameter ?
                pos < signature.parameters.length - 1 ? getTypeOfSymbol(signature.parameters[pos]) : getRestTypeOfSignature(signature) :
                pos < signature.parameters.length ? getTypeOfSymbol(signature.parameters[pos]) : anyType;
        }
        function assignContextualParameterTypes(signature, context, mapper) {
            var len = signature.parameters.length - (signature.hasRestParameter ? 1 : 0);
            for (var i = 0; i < len; i++) {
                var parameter = signature.parameters[i];
                var contextualParameterType = getTypeAtPosition(context, i);
                assignTypeToParameterAndFixTypeParameters(parameter, contextualParameterType, mapper);
            }
            if (signature.hasRestParameter && isRestParameterIndex(context, signature.parameters.length - 1)) {
                var parameter = ts.lastOrUndefined(signature.parameters);
                var contextualParameterType = getTypeOfSymbol(ts.lastOrUndefined(context.parameters));
                assignTypeToParameterAndFixTypeParameters(parameter, contextualParameterType, mapper);
            }
        }
        // When contextual typing assigns a type to a parameter that contains a binding pattern, we also need to push
        // the destructured type into the contained binding elements.
        function assignBindingElementTypes(node) {
            if (ts.isBindingPattern(node.name)) {
                for (var _i = 0, _a = node.name.elements; _i < _a.length; _i++) {
                    var element = _a[_i];
                    if (element.kind !== 190 /* OmittedExpression */) {
                        if (element.name.kind === 69 /* Identifier */) {
                            getSymbolLinks(getSymbolOfNode(element)).type = getTypeForBindingElement(element);
                        }
                        assignBindingElementTypes(element);
                    }
                }
            }
        }
        function assignTypeToParameterAndFixTypeParameters(parameter, contextualType, mapper) {
            var links = getSymbolLinks(parameter);
            if (!links.type) {
                links.type = instantiateType(contextualType, mapper);
                assignBindingElementTypes(parameter.valueDeclaration);
            }
            else if (isInferentialContext(mapper)) {
                // Even if the parameter already has a type, it might be because it was given a type while
                // processing the function as an argument to a prior signature during overload resolution.
                // If this was the case, it may have caused some type parameters to be fixed. So here,
                // we need to ensure that type parameters at the same positions get fixed again. This is
                // done by calling instantiateType to attach the mapper to the contextualType, and then
                // calling inferTypes to force a walk of contextualType so that all the correct fixing
                // happens. The choice to pass in links.type may seem kind of arbitrary, but it serves
                // to make sure that all the correct positions in contextualType are reached by the walk.
                // Here is an example:
                //
                //      interface Base {
                //          baseProp;
                //      }
                //      interface Derived extends Base {
                //          toBase(): Base;
                //      }
                //
                //      var derived: Derived;
                //
                //      declare function foo<T>(x: T, func: (p: T) => T): T;
                //      declare function foo<T>(x: T, func: (p: T) => T): T;
                //
                //      var result = foo(derived, d => d.toBase());
                //
                // We are typing d while checking the second overload. But we've already given d
                // a type (Derived) from the first overload. However, we still want to fix the
                // T in the second overload so that we do not infer Base as a candidate for T
                // (inferring Base would make type argument inference inconsistent between the two
                // overloads).
                inferTypes(mapper.context, links.type, instantiateType(contextualType, mapper));
            }
        }
        function getReturnTypeFromJSDocComment(func) {
            var returnTag = ts.getJSDocReturnTag(func);
            if (returnTag && returnTag.typeExpression) {
                return getTypeFromTypeNode(returnTag.typeExpression.type);
            }
            return undefined;
        }
        function createPromiseType(promisedType) {
            // creates a `Promise<T>` type where `T` is the promisedType argument
            var globalPromiseType = getGlobalPromiseType();
            if (globalPromiseType !== emptyGenericType) {
                // if the promised type is itself a promise, get the underlying type; otherwise, fallback to the promised type
                promisedType = getAwaitedType(promisedType);
                return createTypeReference(globalPromiseType, [promisedType]);
            }
            return emptyObjectType;
        }
        function getReturnTypeFromBody(func, contextualMapper) {
            var contextualSignature = getContextualSignatureForFunctionLikeDeclaration(func);
            if (!func.body) {
                return unknownType;
            }
            var isAsync = ts.isAsyncFunctionLike(func);
            var type;
            if (func.body.kind !== 195 /* Block */) {
                type = checkExpressionCached(func.body, contextualMapper);
                if (isAsync) {
                    // From within an async function you can return either a non-promise value or a promise. Any
                    // Promise/A+ compatible implementation will always assimilate any foreign promise, so the
                    // return type of the body should be unwrapped to its awaited type, which we will wrap in
                    // the native Promise<T> type later in this function.
                    type = checkAwaitedType(type, func, ts.Diagnostics.Return_expression_in_async_function_does_not_have_a_valid_callable_then_member);
                }
            }
            else {
                var types = void 0;
                var funcIsGenerator = !!func.asteriskToken;
                if (funcIsGenerator) {
                    types = checkAndAggregateYieldOperandTypes(func.body, contextualMapper);
                    if (types.length === 0) {
                        var iterableIteratorAny = createIterableIteratorType(anyType);
                        if (compilerOptions.noImplicitAny) {
                            error(func.asteriskToken, ts.Diagnostics.Generator_implicitly_has_type_0_because_it_does_not_yield_any_values_Consider_supplying_a_return_type, typeToString(iterableIteratorAny));
                        }
                        return iterableIteratorAny;
                    }
                }
                else {
                    types = checkAndAggregateReturnExpressionTypes(func.body, contextualMapper, isAsync);
                    if (types.length === 0) {
                        if (isAsync) {
                            // For an async function, the return type will not be void, but rather a Promise for void.
                            var promiseType = createPromiseType(voidType);
                            if (promiseType === emptyObjectType) {
                                error(func, ts.Diagnostics.An_async_function_or_method_must_have_a_valid_awaitable_return_type);
                                return unknownType;
                            }
                            return promiseType;
                        }
                        else {
                            return voidType;
                        }
                    }
                }
                // When yield/return statements are contextually typed we allow the return type to be a union type.
                // Otherwise we require the yield/return expressions to have a best common supertype.
                type = contextualSignature ? getUnionType(types) : getCommonSupertype(types);
                if (!type) {
                    if (funcIsGenerator) {
                        error(func, ts.Diagnostics.No_best_common_type_exists_among_yield_expressions);
                        return createIterableIteratorType(unknownType);
                    }
                    else {
                        error(func, ts.Diagnostics.No_best_common_type_exists_among_return_expressions);
                        // Defer to unioning the return types so we get a) downstream errors earlier and b) better Salsa experience
                        return getUnionType(types);
                    }
                }
                if (funcIsGenerator) {
                    type = createIterableIteratorType(type);
                }
            }
            if (!contextualSignature) {
                reportErrorsFromWidening(func, type);
            }
            var widenedType = getWidenedType(type);
            if (isAsync) {
                // From within an async function you can return either a non-promise value or a promise. Any
                // Promise/A+ compatible implementation will always assimilate any foreign promise, so the
                // return type of the body is awaited type of the body, wrapped in a native Promise<T> type.
                var promiseType = createPromiseType(widenedType);
                if (promiseType === emptyObjectType) {
                    error(func, ts.Diagnostics.An_async_function_or_method_must_have_a_valid_awaitable_return_type);
                    return unknownType;
                }
                return promiseType;
            }
            else {
                return widenedType;
            }
        }
        function checkAndAggregateYieldOperandTypes(body, contextualMapper) {
            var aggregatedTypes = [];
            ts.forEachYieldExpression(body, function (yieldExpression) {
                var expr = yieldExpression.expression;
                if (expr) {
                    var type = checkExpressionCached(expr, contextualMapper);
                    if (yieldExpression.asteriskToken) {
                        // A yield* expression effectively yields everything that its operand yields
                        type = checkElementTypeOfIterable(type, yieldExpression.expression);
                    }
                    if (!ts.contains(aggregatedTypes, type)) {
                        aggregatedTypes.push(type);
                    }
                }
            });
            return aggregatedTypes;
        }
        function checkAndAggregateReturnExpressionTypes(body, contextualMapper, isAsync) {
            var aggregatedTypes = [];
            ts.forEachReturnStatement(body, function (returnStatement) {
                var expr = returnStatement.expression;
                if (expr) {
                    var type = checkExpressionCached(expr, contextualMapper);
                    if (isAsync) {
                        // From within an async function you can return either a non-promise value or a promise. Any
                        // Promise/A+ compatible implementation will always assimilate any foreign promise, so the
                        // return type of the body should be unwrapped to its awaited type, which should be wrapped in
                        // the native Promise<T> type by the caller.
                        type = checkAwaitedType(type, body.parent, ts.Diagnostics.Return_expression_in_async_function_does_not_have_a_valid_callable_then_member);
                    }
                    if (!ts.contains(aggregatedTypes, type)) {
                        aggregatedTypes.push(type);
                    }
                }
            });
            return aggregatedTypes;
        }
        /**
         * TypeScript Specification 1.0 (6.3) - July 2014
         *   An explicitly typed function whose return type isn't the Void type,
         *   the Any type, or a union type containing the Void or Any type as a constituent
         *   must have at least one return statement somewhere in its body.
         *   An exception to this rule is if the function implementation consists of a single 'throw' statement.
         *
         * @param returnType - return type of the function, can be undefined if return type is not explicitly specified
         */
        function checkAllCodePathsInNonVoidFunctionReturnOrThrow(func, returnType) {
            if (!produceDiagnostics) {
                return;
            }
            // Functions with with an explicitly specified 'void' or 'any' return type don't need any return expressions.
            if (returnType === voidType || isTypeAny(returnType) || (returnType && (returnType.flags & 16384 /* Union */) && someConstituentTypeHasKind(returnType, 1 /* Any */ | 16 /* Void */))) {
                return;
            }
            // If all we have is a function signature, or an arrow function with an expression body, then there is nothing to check.
            // also if HasImplicitReturn flag is not set this means that all codepaths in function body end with return or throw
            if (ts.nodeIsMissing(func.body) || func.body.kind !== 195 /* Block */ || !(func.flags & 524288 /* HasImplicitReturn */)) {
                return;
            }
            var hasExplicitReturn = func.flags & 1048576 /* HasExplicitReturn */;
            if (returnType && !hasExplicitReturn) {
                // minimal check: function has syntactic return type annotation and no explicit return statements in the body
                // this function does not conform to the specification.
                // NOTE: having returnType !== undefined is a precondition for entering this branch so func.type will always be present
                error(func.type, ts.Diagnostics.A_function_whose_declared_type_is_neither_void_nor_any_must_return_a_value);
            }
            else if (compilerOptions.noImplicitReturns) {
                if (!returnType) {
                    // If return type annotation is omitted check if function has any explicit return statements.
                    // If it does not have any - its inferred return type is void - don't do any checks.
                    // Otherwise get inferred return type from function body and report error only if it is not void / anytype
                    var inferredReturnType = hasExplicitReturn
                        ? getReturnTypeOfSignature(getSignatureFromDeclaration(func))
                        : voidType;
                    if (inferredReturnType === voidType || isTypeAny(inferredReturnType)) {
                        return;
                    }
                }
                error(func.type || func, ts.Diagnostics.Not_all_code_paths_return_a_value);
            }
        }
        function checkFunctionExpressionOrObjectLiteralMethod(node, contextualMapper) {
            ts.Debug.assert(node.kind !== 144 /* MethodDeclaration */ || ts.isObjectLiteralMethod(node));
            // Grammar checking
            var hasGrammarError = checkGrammarFunctionLikeDeclaration(node);
            if (!hasGrammarError && node.kind === 176 /* FunctionExpression */) {
                checkGrammarForGenerator(node);
            }
            // The identityMapper object is used to indicate that function expressions are wildcards
            if (contextualMapper === identityMapper && isContextSensitive(node)) {
                checkNodeDeferred(node);
                return anyFunctionType;
            }
            var links = getNodeLinks(node);
            var type = getTypeOfSymbol(node.symbol);
            var contextSensitive = isContextSensitive(node);
            var mightFixTypeParameters = contextSensitive && isInferentialContext(contextualMapper);
            // Check if function expression is contextually typed and assign parameter types if so.
            // See the comment in assignTypeToParameterAndFixTypeParameters to understand why we need to
            // check mightFixTypeParameters.
            if (mightFixTypeParameters || !(links.flags & 1024 /* ContextChecked */)) {
                var contextualSignature = getContextualSignature(node);
                // If a type check is started at a function expression that is an argument of a function call, obtaining the
                // contextual type may recursively get back to here during overload resolution of the call. If so, we will have
                // already assigned contextual types.
                var contextChecked = !!(links.flags & 1024 /* ContextChecked */);
                if (mightFixTypeParameters || !contextChecked) {
                    links.flags |= 1024 /* ContextChecked */;
                    if (contextualSignature) {
                        var signature = getSignaturesOfType(type, 0 /* Call */)[0];
                        if (contextSensitive) {
                            assignContextualParameterTypes(signature, contextualSignature, contextualMapper || identityMapper);
                        }
                        if (mightFixTypeParameters || !node.type && !signature.resolvedReturnType) {
                            var returnType = getReturnTypeFromBody(node, contextualMapper);
                            if (!signature.resolvedReturnType) {
                                signature.resolvedReturnType = returnType;
                            }
                        }
                    }
                    if (!contextChecked) {
                        checkSignatureDeclaration(node);
                        checkNodeDeferred(node);
                    }
                }
            }
            if (produceDiagnostics && node.kind !== 144 /* MethodDeclaration */ && node.kind !== 143 /* MethodSignature */) {
                checkCollisionWithCapturedSuperVariable(node, node.name);
                checkCollisionWithCapturedThisVariable(node, node.name);
            }
            return type;
        }
        function checkFunctionExpressionOrObjectLiteralMethodDeferred(node) {
            ts.Debug.assert(node.kind !== 144 /* MethodDeclaration */ || ts.isObjectLiteralMethod(node));
            var isAsync = ts.isAsyncFunctionLike(node);
            var returnOrPromisedType = node.type && (isAsync ? checkAsyncFunctionReturnType(node) : getTypeFromTypeNode(node.type));
            if (!node.asteriskToken) {
                // return is not necessary in the body of generators
                checkAllCodePathsInNonVoidFunctionReturnOrThrow(node, returnOrPromisedType);
            }
            if (node.body) {
                if (!node.type) {
                    // There are some checks that are only performed in getReturnTypeFromBody, that may produce errors
                    // we need. An example is the noImplicitAny errors resulting from widening the return expression
                    // of a function. Because checking of function expression bodies is deferred, there was never an
                    // appropriate time to do this during the main walk of the file (see the comment at the top of
                    // checkFunctionExpressionBodies). So it must be done now.
                    getReturnTypeOfSignature(getSignatureFromDeclaration(node));
                }
                if (node.body.kind === 195 /* Block */) {
                    checkSourceElement(node.body);
                }
                else {
                    // From within an async function you can return either a non-promise value or a promise. Any
                    // Promise/A+ compatible implementation will always assimilate any foreign promise, so we
                    // should not be checking assignability of a promise to the return type. Instead, we need to
                    // check assignability of the awaited type of the expression body against the promised type of
                    // its return type annotation.
                    var exprType = checkExpression(node.body);
                    if (returnOrPromisedType) {
                        if (isAsync) {
                            var awaitedType = checkAwaitedType(exprType, node.body, ts.Diagnostics.Expression_body_for_async_arrow_function_does_not_have_a_valid_callable_then_member);
                            checkTypeAssignableTo(awaitedType, returnOrPromisedType, node.body);
                        }
                        else {
                            checkTypeAssignableTo(exprType, returnOrPromisedType, node.body);
                        }
                    }
                }
            }
        }
        function checkArithmeticOperandType(operand, type, diagnostic) {
            if (!isTypeAnyOrAllConstituentTypesHaveKind(type, 132 /* NumberLike */)) {
                error(operand, diagnostic);
                return false;
            }
            return true;
        }
        function checkReferenceExpression(n, invalidReferenceMessage, constantVariableMessage) {
            function findSymbol(n) {
                var symbol = getNodeLinks(n).resolvedSymbol;
                // Because we got the symbol from the resolvedSymbol property, it might be of kind
                // SymbolFlags.ExportValue. In this case it is necessary to get the actual export
                // symbol, which will have the correct flags set on it.
                return symbol && getExportSymbolOfValueSymbolIfExported(symbol);
            }
            function isReferenceOrErrorExpression(n) {
                // TypeScript 1.0 spec (April 2014):
                // Expressions are classified as values or references.
                // References are the subset of expressions that are permitted as the target of an assignment.
                // Specifically, references are combinations of identifiers(section 4.3), parentheses(section 4.7),
                // and property accesses(section 4.10).
                // All other expression constructs described in this chapter are classified as values.
                switch (n.kind) {
                    case 69 /* Identifier */: {
                        var symbol = findSymbol(n);
                        // TypeScript 1.0 spec (April 2014): 4.3
                        // An identifier expression that references a variable or parameter is classified as a reference.
                        // An identifier expression that references any other kind of entity is classified as a value(and therefore cannot be the target of an assignment).
                        return !symbol || symbol === unknownSymbol || symbol === argumentsSymbol || (symbol.flags & 3 /* Variable */) !== 0;
                    }
                    case 169 /* PropertyAccessExpression */: {
                        var symbol = findSymbol(n);
                        // TypeScript 1.0 spec (April 2014): 4.10
                        // A property access expression is always classified as a reference.
                        // NOTE (not in spec): assignment to enum members should not be allowed
                        return !symbol || symbol === unknownSymbol || (symbol.flags & ~8 /* EnumMember */) !== 0;
                    }
                    case 170 /* ElementAccessExpression */:
                        //  old compiler doesn't check indexed access
                        return true;
                    case 175 /* ParenthesizedExpression */:
                        return isReferenceOrErrorExpression(n.expression);
                    default:
                        return false;
                }
            }
            function isConstVariableReference(n) {
                switch (n.kind) {
                    case 69 /* Identifier */:
                    case 169 /* PropertyAccessExpression */: {
                        var symbol = findSymbol(n);
                        return symbol && (symbol.flags & 3 /* Variable */) !== 0 && (getDeclarationFlagsFromSymbol(symbol) & 16384 /* Const */) !== 0;
                    }
                    case 170 /* ElementAccessExpression */: {
                        var index = n.argumentExpression;
                        var symbol = findSymbol(n.expression);
                        if (symbol && index && index.kind === 9 /* StringLiteral */) {
                            var name_4 = index.text;
                            var prop = getPropertyOfType(getTypeOfSymbol(symbol), name_4);
                            return prop && (prop.flags & 3 /* Variable */) !== 0 && (getDeclarationFlagsFromSymbol(prop) & 16384 /* Const */) !== 0;
                        }
                        return false;
                    }
                    case 175 /* ParenthesizedExpression */:
                        return isConstVariableReference(n.expression);
                    default:
                        return false;
                }
            }
            if (!isReferenceOrErrorExpression(n)) {
                error(n, invalidReferenceMessage);
                return false;
            }
            if (isConstVariableReference(n)) {
                error(n, constantVariableMessage);
                return false;
            }
            return true;
        }
        function checkDeleteExpression(node) {
            checkExpression(node.expression);
            return booleanType;
        }
        function checkTypeOfExpression(node) {
            checkExpression(node.expression);
            return stringType;
        }
        function checkVoidExpression(node) {
            checkExpression(node.expression);
            return undefinedType;
        }
        function checkAwaitExpression(node) {
            // Grammar checking
            if (produceDiagnostics) {
                if (!(node.parserContextFlags & 8 /* Await */)) {
                    grammarErrorOnFirstToken(node, ts.Diagnostics.await_expression_is_only_allowed_within_an_async_function);
                }
                if (isInParameterInitializerBeforeContainingFunction(node)) {
                    error(node, ts.Diagnostics.await_expressions_cannot_be_used_in_a_parameter_initializer);
                }
            }
            var operandType = checkExpression(node.expression);
            return checkAwaitedType(operandType, node);
        }
        function checkPrefixUnaryExpression(node) {
            var operandType = checkExpression(node.operand);
            switch (node.operator) {
                case 35 /* PlusToken */:
                case 36 /* MinusToken */:
                case 50 /* TildeToken */:
                    if (someConstituentTypeHasKind(operandType, 16777216 /* ESSymbol */)) {
                        error(node.operand, ts.Diagnostics.The_0_operator_cannot_be_applied_to_type_symbol, ts.tokenToString(node.operator));
                    }
                    return numberType;
                case 49 /* ExclamationToken */:
                    return booleanType;
                case 41 /* PlusPlusToken */:
                case 42 /* MinusMinusToken */:
                    var ok = checkArithmeticOperandType(node.operand, operandType, ts.Diagnostics.An_arithmetic_operand_must_be_of_type_any_number_or_an_enum_type);
                    if (ok) {
                        // run check only if former checks succeeded to avoid reporting cascading errors
                        checkReferenceExpression(node.operand, ts.Diagnostics.The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_property_or_indexer, ts.Diagnostics.The_operand_of_an_increment_or_decrement_operator_cannot_be_a_constant);
                    }
                    return numberType;
            }
            return unknownType;
        }
        function checkPostfixUnaryExpression(node) {
            var operandType = checkExpression(node.operand);
            var ok = checkArithmeticOperandType(node.operand, operandType, ts.Diagnostics.An_arithmetic_operand_must_be_of_type_any_number_or_an_enum_type);
            if (ok) {
                // run check only if former checks succeeded to avoid reporting cascading errors
                checkReferenceExpression(node.operand, ts.Diagnostics.The_operand_of_an_increment_or_decrement_operator_must_be_a_variable_property_or_indexer, ts.Diagnostics.The_operand_of_an_increment_or_decrement_operator_cannot_be_a_constant);
            }
            return numberType;
        }
        // Just like isTypeOfKind below, except that it returns true if *any* constituent
        // has this kind.
        function someConstituentTypeHasKind(type, kind) {
            if (type.flags & kind) {
                return true;
            }
            if (type.flags & 49152 /* UnionOrIntersection */) {
                var types = type.types;
                for (var _i = 0, types_10 = types; _i < types_10.length; _i++) {
                    var current = types_10[_i];
                    if (current.flags & kind) {
                        return true;
                    }
                }
                return false;
            }
            return false;
        }
        // Return true if type has the given flags, or is a union or intersection type composed of types that all have those flags.
        function allConstituentTypesHaveKind(type, kind) {
            if (type.flags & kind) {
                return true;
            }
            if (type.flags & 49152 /* UnionOrIntersection */) {
                var types = type.types;
                for (var _i = 0, types_11 = types; _i < types_11.length; _i++) {
                    var current = types_11[_i];
                    if (!(current.flags & kind)) {
                        return false;
                    }
                }
                return true;
            }
            return false;
        }
        function isConstEnumObjectType(type) {
            return type.flags & (80896 /* ObjectType */ | 65536 /* Anonymous */) && type.symbol && isConstEnumSymbol(type.symbol);
        }
        function isConstEnumSymbol(symbol) {
            return (symbol.flags & 128 /* ConstEnum */) !== 0;
        }
        function checkInstanceOfExpression(left, right, leftType, rightType) {
            // TypeScript 1.0 spec (April 2014): 4.15.4
            // The instanceof operator requires the left operand to be of type Any, an object type, or a type parameter type,
            // and the right operand to be of type Any or a subtype of the 'Function' interface type.
            // The result is always of the Boolean primitive type.
            // NOTE: do not raise error if leftType is unknown as related error was already reported
            if (allConstituentTypesHaveKind(leftType, 16777726 /* Primitive */)) {
                error(left, ts.Diagnostics.The_left_hand_side_of_an_instanceof_expression_must_be_of_type_any_an_object_type_or_a_type_parameter);
            }
            // NOTE: do not raise error if right is unknown as related error was already reported
            if (!(isTypeAny(rightType) || isTypeSubtypeOf(rightType, globalFunctionType))) {
                error(right, ts.Diagnostics.The_right_hand_side_of_an_instanceof_expression_must_be_of_type_any_or_of_a_type_assignable_to_the_Function_interface_type);
            }
            return booleanType;
        }
        function checkInExpression(left, right, leftType, rightType) {
            // TypeScript 1.0 spec (April 2014): 4.15.5
            // The in operator requires the left operand to be of type Any, the String primitive type, or the Number primitive type,
            // and the right operand to be of type Any, an object type, or a type parameter type.
            // The result is always of the Boolean primitive type.
            if (!isTypeAnyOrAllConstituentTypesHaveKind(leftType, 258 /* StringLike */ | 132 /* NumberLike */ | 16777216 /* ESSymbol */)) {
                error(left, ts.Diagnostics.The_left_hand_side_of_an_in_expression_must_be_of_type_any_string_number_or_symbol);
            }
            if (!isTypeAnyOrAllConstituentTypesHaveKind(rightType, 80896 /* ObjectType */ | 512 /* TypeParameter */)) {
                error(right, ts.Diagnostics.The_right_hand_side_of_an_in_expression_must_be_of_type_any_an_object_type_or_a_type_parameter);
            }
            return booleanType;
        }
        function checkObjectLiteralAssignment(node, sourceType, contextualMapper) {
            var properties = node.properties;
            for (var _i = 0, properties_3 = properties; _i < properties_3.length; _i++) {
                var p = properties_3[_i];
                if (p.kind === 248 /* PropertyAssignment */ || p.kind === 249 /* ShorthandPropertyAssignment */) {
                    var name_5 = p.name;
                    if (name_5.kind === 137 /* ComputedPropertyName */) {
                        checkComputedPropertyName(name_5);
                    }
                    if (isComputedNonLiteralName(name_5)) {
                        continue;
                    }
                    var text = getTextOfPropertyName(name_5);
                    var type = isTypeAny(sourceType)
                        ? sourceType
                        : getTypeOfPropertyOfType(sourceType, text) ||
                            isNumericLiteralName(text) && getIndexTypeOfType(sourceType, 1 /* Number */) ||
                            getIndexTypeOfType(sourceType, 0 /* String */);
                    if (type) {
                        if (p.kind === 249 /* ShorthandPropertyAssignment */) {
                            checkDestructuringAssignment(p, type);
                        }
                        else {
                            // non-shorthand property assignments should always have initializers
                            checkDestructuringAssignment(p.initializer, type);
                        }
                    }
                    else {
                        error(name_5, ts.Diagnostics.Type_0_has_no_property_1_and_no_string_index_signature, typeToString(sourceType), ts.declarationNameToString(name_5));
                    }
                }
                else {
                    error(p, ts.Diagnostics.Property_assignment_expected);
                }
            }
            return sourceType;
        }
        function checkArrayLiteralAssignment(node, sourceType, contextualMapper) {
            // This elementType will be used if the specific property corresponding to this index is not
            // present (aka the tuple element property). This call also checks that the parentType is in
            // fact an iterable or array (depending on target language).
            var elementType = checkIteratedTypeOrElementType(sourceType, node, /*allowStringInput*/ false) || unknownType;
            var elements = node.elements;
            for (var i = 0; i < elements.length; i++) {
                var e = elements[i];
                if (e.kind !== 190 /* OmittedExpression */) {
                    if (e.kind !== 188 /* SpreadElementExpression */) {
                        var propName = "" + i;
                        var type = isTypeAny(sourceType)
                            ? sourceType
                            : isTupleLikeType(sourceType)
                                ? getTypeOfPropertyOfType(sourceType, propName)
                                : elementType;
                        if (type) {
                            checkDestructuringAssignment(e, type, contextualMapper);
                        }
                        else {
                            if (isTupleType(sourceType)) {
                                error(e, ts.Diagnostics.Tuple_type_0_with_length_1_cannot_be_assigned_to_tuple_with_length_2, typeToString(sourceType), sourceType.elementTypes.length, elements.length);
                            }
                            else {
                                error(e, ts.Diagnostics.Type_0_has_no_property_1, typeToString(sourceType), propName);
                            }
                        }
                    }
                    else {
                        if (i < elements.length - 1) {
                            error(e, ts.Diagnostics.A_rest_element_must_be_last_in_an_array_destructuring_pattern);
                        }
                        else {
                            var restExpression = e.expression;
                            if (restExpression.kind === 184 /* BinaryExpression */ && restExpression.operatorToken.kind === 56 /* EqualsToken */) {
                                error(restExpression.operatorToken, ts.Diagnostics.A_rest_element_cannot_have_an_initializer);
                            }
                            else {
                                checkDestructuringAssignment(restExpression, createArrayType(elementType), contextualMapper);
                            }
                        }
                    }
                }
            }
            return sourceType;
        }
        function checkDestructuringAssignment(exprOrAssignment, sourceType, contextualMapper) {
            var target;
            if (exprOrAssignment.kind === 249 /* ShorthandPropertyAssignment */) {
                var prop = exprOrAssignment;
                if (prop.objectAssignmentInitializer) {
                    checkBinaryLikeExpression(prop.name, prop.equalsToken, prop.objectAssignmentInitializer, contextualMapper);
                }
                target = exprOrAssignment.name;
            }
            else {
                target = exprOrAssignment;
            }
            if (target.kind === 184 /* BinaryExpression */ && target.operatorToken.kind === 56 /* EqualsToken */) {
                checkBinaryExpression(target, contextualMapper);
                target = target.left;
            }
            if (target.kind === 168 /* ObjectLiteralExpression */) {
                return checkObjectLiteralAssignment(target, sourceType, contextualMapper);
            }
            if (target.kind === 167 /* ArrayLiteralExpression */) {
                return checkArrayLiteralAssignment(target, sourceType, contextualMapper);
            }
            return checkReferenceAssignment(target, sourceType, contextualMapper);
        }
        function checkReferenceAssignment(target, sourceType, contextualMapper) {
            var targetType = checkExpression(target, contextualMapper);
            if (checkReferenceExpression(target, ts.Diagnostics.Invalid_left_hand_side_of_assignment_expression, ts.Diagnostics.Left_hand_side_of_assignment_expression_cannot_be_a_constant)) {
                checkTypeAssignableTo(sourceType, targetType, target, /*headMessage*/ undefined);
            }
            return sourceType;
        }
        function checkBinaryExpression(node, contextualMapper) {
            return checkBinaryLikeExpression(node.left, node.operatorToken, node.right, contextualMapper, node);
        }
        function checkBinaryLikeExpression(left, operatorToken, right, contextualMapper, errorNode) {
            var operator = operatorToken.kind;
            if (operator === 56 /* EqualsToken */ && (left.kind === 168 /* ObjectLiteralExpression */ || left.kind === 167 /* ArrayLiteralExpression */)) {
                return checkDestructuringAssignment(left, checkExpression(right, contextualMapper), contextualMapper);
            }
            var leftType = checkExpression(left, contextualMapper);
            var rightType = checkExpression(right, contextualMapper);
            switch (operator) {
                case 37 /* AsteriskToken */:
                case 38 /* AsteriskAsteriskToken */:
                case 59 /* AsteriskEqualsToken */:
                case 60 /* AsteriskAsteriskEqualsToken */:
                case 39 /* SlashToken */:
                case 61 /* SlashEqualsToken */:
                case 40 /* PercentToken */:
                case 62 /* PercentEqualsToken */:
                case 36 /* MinusToken */:
                case 58 /* MinusEqualsToken */:
                case 43 /* LessThanLessThanToken */:
                case 63 /* LessThanLessThanEqualsToken */:
                case 44 /* GreaterThanGreaterThanToken */:
                case 64 /* GreaterThanGreaterThanEqualsToken */:
                case 45 /* GreaterThanGreaterThanGreaterThanToken */:
                case 65 /* GreaterThanGreaterThanGreaterThanEqualsToken */:
                case 47 /* BarToken */:
                case 67 /* BarEqualsToken */:
                case 48 /* CaretToken */:
                case 68 /* CaretEqualsToken */:
                case 46 /* AmpersandToken */:
                case 66 /* AmpersandEqualsToken */:
                    // TypeScript 1.0 spec (April 2014): 4.19.1
                    // These operators require their operands to be of type Any, the Number primitive type,
                    // or an enum type. Operands of an enum type are treated
                    // as having the primitive type Number. If one operand is the null or undefined value,
                    // it is treated as having the type of the other operand.
                    // The result is always of the Number primitive type.
                    if (leftType.flags & (32 /* Undefined */ | 64 /* Null */))
                        leftType = rightType;
                    if (rightType.flags & (32 /* Undefined */ | 64 /* Null */))
                        rightType = leftType;
                    var suggestedOperator = void 0;
                    // if a user tries to apply a bitwise operator to 2 boolean operands
                    // try and return them a helpful suggestion
                    if ((leftType.flags & 8 /* Boolean */) &&
                        (rightType.flags & 8 /* Boolean */) &&
                        (suggestedOperator = getSuggestedBooleanOperator(operatorToken.kind)) !== undefined) {
                        error(errorNode || operatorToken, ts.Diagnostics.The_0_operator_is_not_allowed_for_boolean_types_Consider_using_1_instead, ts.tokenToString(operatorToken.kind), ts.tokenToString(suggestedOperator));
                    }
                    else {
                        // otherwise just check each operand separately and report errors as normal
                        var leftOk = checkArithmeticOperandType(left, leftType, ts.Diagnostics.The_left_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_or_an_enum_type);
                        var rightOk = checkArithmeticOperandType(right, rightType, ts.Diagnostics.The_right_hand_side_of_an_arithmetic_operation_must_be_of_type_any_number_or_an_enum_type);
                        if (leftOk && rightOk) {
                            checkAssignmentOperator(numberType);
                        }
                    }
                    return numberType;
                case 35 /* PlusToken */:
                case 57 /* PlusEqualsToken */:
                    // TypeScript 1.0 spec (April 2014): 4.19.2
                    // The binary + operator requires both operands to be of the Number primitive type or an enum type,
                    // or at least one of the operands to be of type Any or the String primitive type.
                    // If one operand is the null or undefined value, it is treated as having the type of the other operand.
                    if (leftType.flags & (32 /* Undefined */ | 64 /* Null */))
                        leftType = rightType;
                    if (rightType.flags & (32 /* Undefined */ | 64 /* Null */))
                        rightType = leftType;
                    var resultType = void 0;
                    if (allConstituentTypesHaveKind(leftType, 132 /* NumberLike */) && allConstituentTypesHaveKind(rightType, 132 /* NumberLike */)) {
                        // Operands of an enum type are treated as having the primitive type Number.
                        // If both operands are of the Number primitive type, the result is of the Number primitive type.
                        resultType = numberType;
                    }
                    else {
                        if (allConstituentTypesHaveKind(leftType, 258 /* StringLike */) || allConstituentTypesHaveKind(rightType, 258 /* StringLike */)) {
                            // If one or both operands are of the String primitive type, the result is of the String primitive type.
                            resultType = stringType;
                        }
                        else if (isTypeAny(leftType) || isTypeAny(rightType)) {
                            // Otherwise, the result is of type Any.
                            // NOTE: unknown type here denotes error type. Old compiler treated this case as any type so do we.
                            resultType = leftType === unknownType || rightType === unknownType ? unknownType : anyType;
                        }
                        // Symbols are not allowed at all in arithmetic expressions
                        if (resultType && !checkForDisallowedESSymbolOperand(operator)) {
                            return resultType;
                        }
                    }
                    if (!resultType) {
                        reportOperatorError();
                        return anyType;
                    }
                    if (operator === 57 /* PlusEqualsToken */) {
                        checkAssignmentOperator(resultType);
                    }
                    return resultType;
                case 25 /* LessThanToken */:
                case 27 /* GreaterThanToken */:
                case 28 /* LessThanEqualsToken */:
                case 29 /* GreaterThanEqualsToken */:
                    if (!checkForDisallowedESSymbolOperand(operator)) {
                        return booleanType;
                    }
                // Fall through
                case 30 /* EqualsEqualsToken */:
                case 31 /* ExclamationEqualsToken */:
                case 32 /* EqualsEqualsEqualsToken */:
                case 33 /* ExclamationEqualsEqualsToken */:
                    // Permit 'number[] | "foo"' to be asserted to 'string'.
                    if (someConstituentTypeHasKind(leftType, 258 /* StringLike */) && someConstituentTypeHasKind(rightType, 258 /* StringLike */)) {
                        return booleanType;
                    }
                    if (!isTypeAssignableTo(leftType, rightType) && !isTypeAssignableTo(rightType, leftType)) {
                        reportOperatorError();
                    }
                    return booleanType;
                case 91 /* InstanceOfKeyword */:
                    return checkInstanceOfExpression(left, right, leftType, rightType);
                case 90 /* InKeyword */:
                    return checkInExpression(left, right, leftType, rightType);
                case 51 /* AmpersandAmpersandToken */:
                    return rightType;
                case 52 /* BarBarToken */:
                    return getUnionType([leftType, rightType]);
                case 56 /* EqualsToken */:
                    checkAssignmentOperator(rightType);
                    return getRegularTypeOfObjectLiteral(rightType);
                case 24 /* CommaToken */:
                    return rightType;
            }
            // Return true if there was no error, false if there was an error.
            function checkForDisallowedESSymbolOperand(operator) {
                var offendingSymbolOperand = someConstituentTypeHasKind(leftType, 16777216 /* ESSymbol */) ? left :
                    someConstituentTypeHasKind(rightType, 16777216 /* ESSymbol */) ? right :
                        undefined;
                if (offendingSymbolOperand) {
                    error(offendingSymbolOperand, ts.Diagnostics.The_0_operator_cannot_be_applied_to_type_symbol, ts.tokenToString(operator));
                    return false;
                }
                return true;
            }
            function getSuggestedBooleanOperator(operator) {
                switch (operator) {
                    case 47 /* BarToken */:
                    case 67 /* BarEqualsToken */:
                        return 52 /* BarBarToken */;
                    case 48 /* CaretToken */:
                    case 68 /* CaretEqualsToken */:
                        return 33 /* ExclamationEqualsEqualsToken */;
                    case 46 /* AmpersandToken */:
                    case 66 /* AmpersandEqualsToken */:
                        return 51 /* AmpersandAmpersandToken */;
                    default:
                        return undefined;
                }
            }
            function checkAssignmentOperator(valueType) {
                if (produceDiagnostics && operator >= 56 /* FirstAssignment */ && operator <= 68 /* LastAssignment */) {
                    // TypeScript 1.0 spec (April 2014): 4.17
                    // An assignment of the form
                    //    VarExpr = ValueExpr
                    // requires VarExpr to be classified as a reference
                    // A compound assignment furthermore requires VarExpr to be classified as a reference (section 4.1)
                    // and the type of the non - compound operation to be assignable to the type of VarExpr.
                    var ok = checkReferenceExpression(left, ts.Diagnostics.Invalid_left_hand_side_of_assignment_expression, ts.Diagnostics.Left_hand_side_of_assignment_expression_cannot_be_a_constant);
                    // Use default messages
                    if (ok) {
                        // to avoid cascading errors check assignability only if 'isReference' check succeeded and no errors were reported
                        checkTypeAssignableTo(valueType, leftType, left, /*headMessage*/ undefined);
                    }
                }
            }
            function reportOperatorError() {
                error(errorNode || operatorToken, ts.Diagnostics.Operator_0_cannot_be_applied_to_types_1_and_2, ts.tokenToString(operatorToken.kind), typeToString(leftType), typeToString(rightType));
            }
        }
        function isYieldExpressionInClass(node) {
            var current = node;
            var parent = node.parent;
            while (parent) {
                if (ts.isFunctionLike(parent) && current === parent.body) {
                    return false;
                }
                else if (ts.isClassLike(current)) {
                    return true;
                }
                current = parent;
                parent = parent.parent;
            }
            return false;
        }
        function checkYieldExpression(node) {
            // Grammar checking
            if (produceDiagnostics) {
                if (!(node.parserContextFlags & 2 /* Yield */) || isYieldExpressionInClass(node)) {
                    grammarErrorOnFirstToken(node, ts.Diagnostics.A_yield_expression_is_only_allowed_in_a_generator_body);
                }
                if (isInParameterInitializerBeforeContainingFunction(node)) {
                    error(node, ts.Diagnostics.yield_expressions_cannot_be_used_in_a_parameter_initializer);
                }
            }
            if (node.expression) {
                var func = ts.getContainingFunction(node);
                // If the user's code is syntactically correct, the func should always have a star. After all,
                // we are in a yield context.
                if (func && func.asteriskToken) {
                    var expressionType = checkExpressionCached(node.expression, /*contextualMapper*/ undefined);
                    var expressionElementType = void 0;
                    var nodeIsYieldStar = !!node.asteriskToken;
                    if (nodeIsYieldStar) {
                        expressionElementType = checkElementTypeOfIterable(expressionType, node.expression);
                    }
                    // There is no point in doing an assignability check if the function
                    // has no explicit return type because the return type is directly computed
                    // from the yield expressions.
                    if (func.type) {
                        var signatureElementType = getElementTypeOfIterableIterator(getTypeFromTypeNode(func.type)) || anyType;
                        if (nodeIsYieldStar) {
                            checkTypeAssignableTo(expressionElementType, signatureElementType, node.expression, /*headMessage*/ undefined);
                        }
                        else {
                            checkTypeAssignableTo(expressionType, signatureElementType, node.expression, /*headMessage*/ undefined);
                        }
                    }
                }
            }
            // Both yield and yield* expressions have type 'any'
            return anyType;
        }
        function checkConditionalExpression(node, contextualMapper) {
            checkExpression(node.condition);
            var type1 = checkExpression(node.whenTrue, contextualMapper);
            var type2 = checkExpression(node.whenFalse, contextualMapper);
            return getUnionType([type1, type2]);
        }
        function checkStringLiteralExpression(node) {
            var contextualType = getContextualType(node);
            if (contextualType && contextualTypeIsStringLiteralType(contextualType)) {
                return getStringLiteralTypeForText(node.text);
            }
            return stringType;
        }
        function checkTemplateExpression(node) {
            // We just want to check each expressions, but we are unconcerned with
            // the type of each expression, as any value may be coerced into a string.
            // It is worth asking whether this is what we really want though.
            // A place where we actually *are* concerned with the expressions' types are
            // in tagged templates.
            ts.forEach(node.templateSpans, function (templateSpan) {
                checkExpression(templateSpan.expression);
            });
            return stringType;
        }
        function checkExpressionWithContextualType(node, contextualType, contextualMapper) {
            var saveContextualType = node.contextualType;
            node.contextualType = contextualType;
            var result = checkExpression(node, contextualMapper);
            node.contextualType = saveContextualType;
            return result;
        }
        function checkExpressionCached(node, contextualMapper) {
            var links = getNodeLinks(node);
            if (!links.resolvedType) {
                links.resolvedType = checkExpression(node, contextualMapper);
            }
            return links.resolvedType;
        }
        function checkPropertyAssignment(node, contextualMapper) {
            // Do not use hasDynamicName here, because that returns false for well known symbols.
            // We want to perform checkComputedPropertyName for all computed properties, including
            // well known symbols.
            if (node.name.kind === 137 /* ComputedPropertyName */) {
                checkComputedPropertyName(node.name);
            }
            return checkExpression(node.initializer, contextualMapper);
        }
        function checkObjectLiteralMethod(node, contextualMapper) {
            // Grammar checking
            checkGrammarMethod(node);
            // Do not use hasDynamicName here, because that returns false for well known symbols.
            // We want to perform checkComputedPropertyName for all computed properties, including
            // well known symbols.
            if (node.name.kind === 137 /* ComputedPropertyName */) {
                checkComputedPropertyName(node.name);
            }
            var uninstantiatedType = checkFunctionExpressionOrObjectLiteralMethod(node, contextualMapper);
            return instantiateTypeWithSingleGenericCallSignature(node, uninstantiatedType, contextualMapper);
        }
        function instantiateTypeWithSingleGenericCallSignature(node, type, contextualMapper) {
            if (isInferentialContext(contextualMapper)) {
                var signature = getSingleCallSignature(type);
                if (signature && signature.typeParameters) {
                    var contextualType = getApparentTypeOfContextualType(node);
                    if (contextualType) {
                        var contextualSignature = getSingleCallSignature(contextualType);
                        if (contextualSignature && !contextualSignature.typeParameters) {
                            return getOrCreateTypeFromSignature(instantiateSignatureInContextOf(signature, contextualSignature, contextualMapper));
                        }
                    }
                }
            }
            return type;
        }
        // Checks an expression and returns its type. The contextualMapper parameter serves two purposes: When
        // contextualMapper is not undefined and not equal to the identityMapper function object it indicates that the
        // expression is being inferentially typed (section 4.12.2 in spec) and provides the type mapper to use in
        // conjunction with the generic contextual type. When contextualMapper is equal to the identityMapper function
        // object, it serves as an indicator that all contained function and arrow expressions should be considered to
        // have the wildcard function type; this form of type check is used during overload resolution to exclude
        // contextually typed function and arrow expressions in the initial phase.
        function checkExpression(node, contextualMapper) {
            var type;
            if (node.kind === 136 /* QualifiedName */) {
                type = checkQualifiedName(node);
            }
            else {
                var uninstantiatedType = checkExpressionWorker(node, contextualMapper);
                type = instantiateTypeWithSingleGenericCallSignature(node, uninstantiatedType, contextualMapper);
            }
            if (isConstEnumObjectType(type)) {
                // enum object type for const enums are only permitted in:
                // - 'left' in property access
                // - 'object' in indexed access
                // - target in rhs of import statement
                var ok = (node.parent.kind === 169 /* PropertyAccessExpression */ && node.parent.expression === node) ||
                    (node.parent.kind === 170 /* ElementAccessExpression */ && node.parent.expression === node) ||
                    ((node.kind === 69 /* Identifier */ || node.kind === 136 /* QualifiedName */) && isInRightSideOfImportOrExportAssignment(node));
                if (!ok) {
                    error(node, ts.Diagnostics.const_enums_can_only_be_used_in_property_or_index_access_expressions_or_the_right_hand_side_of_an_import_declaration_or_export_assignment);
                }
            }
            return type;
        }
        function checkNumericLiteral(node) {
            // Grammar checking
            checkGrammarNumericLiteral(node);
            return numberType;
        }
        function checkExpressionWorker(node, contextualMapper) {
            switch (node.kind) {
                case 69 /* Identifier */:
                    return checkIdentifier(node);
                case 97 /* ThisKeyword */:
                    return checkThisExpression(node);
                case 95 /* SuperKeyword */:
                    return checkSuperExpression(node);
                case 93 /* NullKeyword */:
                    return nullType;
                case 99 /* TrueKeyword */:
                case 84 /* FalseKeyword */:
                    return booleanType;
                case 8 /* NumericLiteral */:
                    return checkNumericLiteral(node);
                case 186 /* TemplateExpression */:
                    return checkTemplateExpression(node);
                case 9 /* StringLiteral */:
                    return checkStringLiteralExpression(node);
                case 11 /* NoSubstitutionTemplateLiteral */:
                    return stringType;
                case 10 /* RegularExpressionLiteral */:
                    return globalRegExpType;
                case 167 /* ArrayLiteralExpression */:
                    return checkArrayLiteral(node, contextualMapper);
                case 168 /* ObjectLiteralExpression */:
                    return checkObjectLiteral(node, contextualMapper);
                case 169 /* PropertyAccessExpression */:
                    return checkPropertyAccessExpression(node);
                case 170 /* ElementAccessExpression */:
                    return checkIndexedAccess(node);
                case 171 /* CallExpression */:
                case 172 /* NewExpression */:
                    return checkCallExpression(node);
                case 173 /* TaggedTemplateExpression */:
                    return checkTaggedTemplateExpression(node);
                case 175 /* ParenthesizedExpression */:
                    return checkExpression(node.expression, contextualMapper);
                case 189 /* ClassExpression */:
                    return checkClassExpression(node);
                case 176 /* FunctionExpression */:
                case 177 /* ArrowFunction */:
                    return checkFunctionExpressionOrObjectLiteralMethod(node, contextualMapper);
                case 179 /* TypeOfExpression */:
                    return checkTypeOfExpression(node);
                case 174 /* TypeAssertionExpression */:
                case 192 /* AsExpression */:
                    return checkAssertion(node);
                case 178 /* DeleteExpression */:
                    return checkDeleteExpression(node);
                case 180 /* VoidExpression */:
                    return checkVoidExpression(node);
                case 181 /* AwaitExpression */:
                    return checkAwaitExpression(node);
                case 182 /* PrefixUnaryExpression */:
                    return checkPrefixUnaryExpression(node);
                case 183 /* PostfixUnaryExpression */:
                    return checkPostfixUnaryExpression(node);
                case 184 /* BinaryExpression */:
                    return checkBinaryExpression(node, contextualMapper);
                case 185 /* ConditionalExpression */:
                    return checkConditionalExpression(node, contextualMapper);
                case 188 /* SpreadElementExpression */:
                    return checkSpreadElementExpression(node, contextualMapper);
                case 190 /* OmittedExpression */:
                    return undefinedType;
                case 187 /* YieldExpression */:
                    return checkYieldExpression(node);
                case 243 /* JsxExpression */:
                    return checkJsxExpression(node);
                case 236 /* JsxElement */:
                    return checkJsxElement(node);
                case 237 /* JsxSelfClosingElement */:
                    return checkJsxSelfClosingElement(node);
                case 238 /* JsxOpeningElement */:
                    ts.Debug.fail("Shouldn't ever directly check a JsxOpeningElement");
            }
            return unknownType;
        }
        // DECLARATION AND STATEMENT TYPE CHECKING
        function checkTypeParameter(node) {
            // Grammar Checking
            if (node.expression) {
                grammarErrorOnFirstToken(node.expression, ts.Diagnostics.Type_expected);
            }
            checkSourceElement(node.constraint);
            getConstraintOfTypeParameter(getDeclaredTypeOfTypeParameter(getSymbolOfNode(node)));
            if (produceDiagnostics) {
                checkTypeNameIsReserved(node.name, ts.Diagnostics.Type_parameter_name_cannot_be_0);
            }
        }
        function checkParameter(node) {
            // Grammar checking
            // It is a SyntaxError if the Identifier "eval" or the Identifier "arguments" occurs as the
            // Identifier in a PropertySetParameterList of a PropertyAssignment that is contained in strict code
            // or if its FunctionBody is strict code(11.1.5).
            // Grammar checking
            checkGrammarDecorators(node) || checkGrammarModifiers(node);
            checkVariableLikeDeclaration(node);
            var func = ts.getContainingFunction(node);
            if (node.flags & 56 /* AccessibilityModifier */) {
                func = ts.getContainingFunction(node);
                if (!(func.kind === 145 /* Constructor */ && ts.nodeIsPresent(func.body))) {
                    error(node, ts.Diagnostics.A_parameter_property_is_only_allowed_in_a_constructor_implementation);
                }
            }
            if (node.questionToken && ts.isBindingPattern(node.name) && func.body) {
                error(node, ts.Diagnostics.A_binding_pattern_parameter_cannot_be_optional_in_an_implementation_signature);
            }
            // Only check rest parameter type if it's not a binding pattern. Since binding patterns are
            // not allowed in a rest parameter, we already have an error from checkGrammarParameterList.
            if (node.dotDotDotToken && !ts.isBindingPattern(node.name) && !isArrayType(getTypeOfSymbol(node.symbol))) {
                error(node, ts.Diagnostics.A_rest_parameter_must_be_of_an_array_type);
            }
        }
        function isSyntacticallyValidGenerator(node) {
            if (!node.asteriskToken || !node.body) {
                return false;
            }
            return node.kind === 144 /* MethodDeclaration */ ||
                node.kind === 216 /* FunctionDeclaration */ ||
                node.kind === 176 /* FunctionExpression */;
        }
        function getTypePredicateParameterIndex(parameterList, parameter) {
            if (parameterList) {
                for (var i = 0; i < parameterList.length; i++) {
                    var param = parameterList[i];
                    if (param.name.kind === 69 /* Identifier */ &&
                        param.name.text === parameter.text) {
                        return i;
                    }
                }
            }
            return -1;
        }
        function checkTypePredicate(node) {
            var parent = getTypePredicateParent(node);
            if (!parent) {
                // The parent must not be valid.
                error(node, ts.Diagnostics.A_type_predicate_is_only_allowed_in_return_type_position_for_functions_and_methods);
                return;
            }
            var typePredicate = getSignatureFromDeclaration(parent).typePredicate;
            if (!typePredicate) {
                return;
            }
            var parameterName = node.parameterName;
            if (ts.isThisTypePredicate(typePredicate)) {
                getTypeFromThisTypeNode(parameterName);
            }
            else {
                if (typePredicate.parameterIndex >= 0) {
                    if (parent.parameters[typePredicate.parameterIndex].dotDotDotToken) {
                        error(parameterName, ts.Diagnostics.A_type_predicate_cannot_reference_a_rest_parameter);
                    }
                    else {
                        checkTypeAssignableTo(typePredicate.type, getTypeOfNode(parent.parameters[typePredicate.parameterIndex]), node.type);
                    }
                }
                else if (parameterName) {
                    var hasReportedError = false;
                    for (var _i = 0, _a = parent.parameters; _i < _a.length; _i++) {
                        var name_6 = _a[_i].name;
                        if (ts.isBindingPattern(name_6) &&
                            checkIfTypePredicateVariableIsDeclaredInBindingPattern(name_6, parameterName, typePredicate.parameterName)) {
                            hasReportedError = true;
                            break;
                        }
                    }
                    if (!hasReportedError) {
                        error(node.parameterName, ts.Diagnostics.Cannot_find_parameter_0, typePredicate.parameterName);
                    }
                }
            }
        }
        function getTypePredicateParent(node) {
            switch (node.parent.kind) {
                case 177 /* ArrowFunction */:
                case 148 /* CallSignature */:
                case 216 /* FunctionDeclaration */:
                case 176 /* FunctionExpression */:
                case 153 /* FunctionType */:
                case 144 /* MethodDeclaration */:
                case 143 /* MethodSignature */:
                    var parent_4 = node.parent;
                    if (node === parent_4.type) {
                        return parent_4;
                    }
            }
        }
        function checkIfTypePredicateVariableIsDeclaredInBindingPattern(pattern, predicateVariableNode, predicateVariableName) {
            for (var _i = 0, _a = pattern.elements; _i < _a.length; _i++) {
                var name_7 = _a[_i].name;
                if (name_7.kind === 69 /* Identifier */ &&
                    name_7.text === predicateVariableName) {
                    error(predicateVariableNode, ts.Diagnostics.A_type_predicate_cannot_reference_element_0_in_a_binding_pattern, predicateVariableName);
                    return true;
                }
                else if (name_7.kind === 165 /* ArrayBindingPattern */ ||
                    name_7.kind === 164 /* ObjectBindingPattern */) {
                    if (checkIfTypePredicateVariableIsDeclaredInBindingPattern(name_7, predicateVariableNode, predicateVariableName)) {
                        return true;
                    }
                }
            }
        }
        function checkSignatureDeclaration(node) {
            // Grammar checking
            if (node.kind === 150 /* IndexSignature */) {
                checkGrammarIndexSignature(node);
            }
            else if (node.kind === 153 /* FunctionType */ || node.kind === 216 /* FunctionDeclaration */ || node.kind === 154 /* ConstructorType */ ||
                node.kind === 148 /* CallSignature */ || node.kind === 145 /* Constructor */ ||
                node.kind === 149 /* ConstructSignature */) {
                checkGrammarFunctionLikeDeclaration(node);
            }
            checkTypeParameters(node.typeParameters);
            ts.forEach(node.parameters, checkParameter);
            if (node.type) {
                checkSourceElement(node.type);
            }
            if (produceDiagnostics) {
                checkCollisionWithArgumentsInGeneratedCode(node);
                if (compilerOptions.noImplicitAny && !node.type) {
                    switch (node.kind) {
                        case 149 /* ConstructSignature */:
                            error(node, ts.Diagnostics.Construct_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type);
                            break;
                        case 148 /* CallSignature */:
                            error(node, ts.Diagnostics.Call_signature_which_lacks_return_type_annotation_implicitly_has_an_any_return_type);
                            break;
                    }
                }
                if (node.type) {
                    if (languageVersion >= 2 /* ES6 */ && isSyntacticallyValidGenerator(node)) {
                        var returnType = getTypeFromTypeNode(node.type);
                        if (returnType === voidType) {
                            error(node.type, ts.Diagnostics.A_generator_cannot_have_a_void_type_annotation);
                        }
                        else {
                            var generatorElementType = getElementTypeOfIterableIterator(returnType) || anyType;
                            var iterableIteratorInstantiation = createIterableIteratorType(generatorElementType);
                            // Naively, one could check that IterableIterator<any> is assignable to the return type annotation.
                            // However, that would not catch the error in the following case.
                            //
                            //    interface BadGenerator extends Iterable<number>, Iterator<string> { }
                            //    function* g(): BadGenerator { } // Iterable and Iterator have different types!
                            //
                            checkTypeAssignableTo(iterableIteratorInstantiation, returnType, node.type);
                        }
                    }
                    else if (ts.isAsyncFunctionLike(node)) {
                        checkAsyncFunctionReturnType(node);
                    }
                }
            }
            checkSpecializedSignatureDeclaration(node);
        }
        function checkTypeForDuplicateIndexSignatures(node) {
            if (node.kind === 218 /* InterfaceDeclaration */) {
                var nodeSymbol = getSymbolOfNode(node);
                // in case of merging interface declaration it is possible that we'll enter this check procedure several times for every declaration
                // to prevent this run check only for the first declaration of a given kind
                if (nodeSymbol.declarations.length > 0 && nodeSymbol.declarations[0] !== node) {
                    return;
                }
            }
            // TypeScript 1.0 spec (April 2014)
            // 3.7.4: An object type can contain at most one string index signature and one numeric index signature.
            // 8.5: A class declaration can have at most one string index member declaration and one numeric index member declaration
            var indexSymbol = getIndexSymbol(getSymbolOfNode(node));
            if (indexSymbol) {
                var seenNumericIndexer = false;
                var seenStringIndexer = false;
                for (var _i = 0, _a = indexSymbol.declarations; _i < _a.length; _i++) {
                    var decl = _a[_i];
                    var declaration = decl;
                    if (declaration.parameters.length === 1 && declaration.parameters[0].type) {
                        switch (declaration.parameters[0].type.kind) {
                            case 130 /* StringKeyword */:
                                if (!seenStringIndexer) {
                                    seenStringIndexer = true;
                                }
                                else {
                                    error(declaration, ts.Diagnostics.Duplicate_string_index_signature);
                                }
                                break;
                            case 128 /* NumberKeyword */:
                                if (!seenNumericIndexer) {
                                    seenNumericIndexer = true;
                                }
                                else {
                                    error(declaration, ts.Diagnostics.Duplicate_number_index_signature);
                                }
                                break;
                        }
                    }
                }
            }
        }
        function checkPropertyDeclaration(node) {
            // Grammar checking
            checkGrammarDecorators(node) || checkGrammarModifiers(node) || checkGrammarProperty(node) || checkGrammarComputedPropertyName(node.name);
            checkVariableLikeDeclaration(node);
        }
        function checkMethodDeclaration(node) {
            // Grammar checking
            checkGrammarMethod(node) || checkGrammarComputedPropertyName(node.name);
            // Grammar checking for modifiers is done inside the function checkGrammarFunctionLikeDeclaration
            checkFunctionOrMethodDeclaration(node);
            // Abstract methods cannot have an implementation.
            // Extra checks are to avoid reporting multiple errors relating to the "abstractness" of the node.
            if (node.flags & 128 /* Abstract */ && node.body) {
                error(node, ts.Diagnostics.Method_0_cannot_have_an_implementation_because_it_is_marked_abstract, ts.declarationNameToString(node.name));
            }
        }
        function checkConstructorDeclaration(node) {
            // Grammar check on signature of constructor and modifier of the constructor is done in checkSignatureDeclaration function.
            checkSignatureDeclaration(node);
            // Grammar check for checking only related to constructoDeclaration
            checkGrammarConstructorTypeParameters(node) || checkGrammarConstructorTypeAnnotation(node);
            checkSourceElement(node.body);
            var symbol = getSymbolOfNode(node);
            var firstDeclaration = ts.getDeclarationOfKind(symbol, node.kind);
            // Only type check the symbol once
            if (node === firstDeclaration) {
                checkFunctionOrConstructorSymbol(symbol);
            }
            // exit early in the case of signature - super checks are not relevant to them
            if (ts.nodeIsMissing(node.body)) {
                return;
            }
            if (!produceDiagnostics) {
                return;
            }
            function markThisReferencesAsErrors(n) {
                if (n.kind === 97 /* ThisKeyword */) {
                    error(n, ts.Diagnostics.this_cannot_be_referenced_in_current_location);
                }
                else if (n.kind !== 176 /* FunctionExpression */ && n.kind !== 216 /* FunctionDeclaration */) {
                    ts.forEachChild(n, markThisReferencesAsErrors);
                }
            }
            function isInstancePropertyWithInitializer(n) {
                return n.kind === 142 /* PropertyDeclaration */ &&
                    !(n.flags & 64 /* Static */) &&
                    !!n.initializer;
            }
            // TS 1.0 spec (April 2014): 8.3.2
            // Constructors of classes with no extends clause may not contain super calls, whereas
            // constructors of derived classes must contain at least one super call somewhere in their function body.
            var containingClassDecl = node.parent;
            if (ts.getClassExtendsHeritageClauseElement(containingClassDecl)) {
                var classExtendsNull = classDeclarationExtendsNull(containingClassDecl);
                var superCall = getSuperCallInConstructor(node);
                if (superCall) {
                    if (classExtendsNull) {
                        error(superCall, ts.Diagnostics.A_constructor_cannot_contain_a_super_call_when_its_class_extends_null);
                    }
                    // The first statement in the body of a constructor (excluding prologue directives) must be a super call
                    // if both of the following are true:
                    // - The containing class is a derived class.
                    // - The constructor declares parameter properties
                    //   or the containing class declares instance member variables with initializers.
                    var superCallShouldBeFirst = ts.forEach(node.parent.members, isInstancePropertyWithInitializer) ||
                        ts.forEach(node.parameters, function (p) { return p.flags & (8 /* Public */ | 16 /* Private */ | 32 /* Protected */); });
                    // Skip past any prologue directives to find the first statement
                    // to ensure that it was a super call.
                    if (superCallShouldBeFirst) {
                        var statements = node.body.statements;
                        var superCallStatement = void 0;
                        for (var _i = 0, statements_1 = statements; _i < statements_1.length; _i++) {
                            var statement = statements_1[_i];
                            if (statement.kind === 198 /* ExpressionStatement */ && ts.isSuperCallExpression(statement.expression)) {
                                superCallStatement = statement;
                                break;
                            }
                            if (!ts.isPrologueDirective(statement)) {
                                break;
                            }
                        }
                        if (!superCallStatement) {
                            error(node, ts.Diagnostics.A_super_call_must_be_the_first_statement_in_the_constructor_when_a_class_contains_initialized_properties_or_has_parameter_properties);
                        }
                    }
                }
                else if (!classExtendsNull) {
                    error(node, ts.Diagnostics.Constructors_for_derived_classes_must_contain_a_super_call);
                }
            }
        }
        function checkAccessorDeclaration(node) {
            if (produceDiagnostics) {
                // Grammar checking accessors
                checkGrammarFunctionLikeDeclaration(node) || checkGrammarAccessor(node) || checkGrammarComputedPropertyName(node.name);
                checkDecorators(node);
                checkSignatureDeclaration(node);
                if (node.kind === 146 /* GetAccessor */) {
                    if (!ts.isInAmbientContext(node) && ts.nodeIsPresent(node.body) && (node.flags & 524288 /* HasImplicitReturn */)) {
                        if (node.flags & 1048576 /* HasExplicitReturn */) {
                            if (compilerOptions.noImplicitReturns) {
                                error(node.name, ts.Diagnostics.Not_all_code_paths_return_a_value);
                            }
                        }
                        else {
                            error(node.name, ts.Diagnostics.A_get_accessor_must_return_a_value);
                        }
                    }
                }
                // Do not use hasDynamicName here, because that returns false for well known symbols.
                // We want to perform checkComputedPropertyName for all computed properties, including
                // well known symbols.
                if (node.name.kind === 137 /* ComputedPropertyName */) {
                    checkComputedPropertyName(node.name);
                }
                if (!ts.hasDynamicName(node)) {
                    // TypeScript 1.0 spec (April 2014): 8.4.3
                    // Accessors for the same member name must specify the same accessibility.
                    var otherKind = node.kind === 146 /* GetAccessor */ ? 147 /* SetAccessor */ : 146 /* GetAccessor */;
                    var otherAccessor = ts.getDeclarationOfKind(node.symbol, otherKind);
                    if (otherAccessor) {
                        if (((node.flags & 56 /* AccessibilityModifier */) !== (otherAccessor.flags & 56 /* AccessibilityModifier */))) {
                            error(node.name, ts.Diagnostics.Getter_and_setter_accessors_do_not_agree_in_visibility);
                        }
                        var currentAccessorType = getAnnotatedAccessorType(node);
                        var otherAccessorType = getAnnotatedAccessorType(otherAccessor);
                        // TypeScript 1.0 spec (April 2014): 4.5
                        // If both accessors include type annotations, the specified types must be identical.
                        if (currentAccessorType && otherAccessorType) {
                            if (!isTypeIdenticalTo(currentAccessorType, otherAccessorType)) {
                                error(node, ts.Diagnostics.get_and_set_accessor_must_have_the_same_type);
                            }
                        }
                    }
                }
                getTypeOfAccessors(getSymbolOfNode(node));
            }
            if (node.parent.kind !== 168 /* ObjectLiteralExpression */) {
                checkSourceElement(node.body);
            }
            else {
                checkNodeDeferred(node);
            }
        }
        function checkAccessorDeferred(node) {
            checkSourceElement(node.body);
        }
        function checkMissingDeclaration(node) {
            checkDecorators(node);
        }
        function checkTypeArgumentConstraints(typeParameters, typeArgumentNodes) {
            var typeArguments;
            var mapper;
            var result = true;
            for (var i = 0; i < typeParameters.length; i++) {
                var constraint = getConstraintOfTypeParameter(typeParameters[i]);
                if (constraint) {
                    if (!typeArguments) {
                        typeArguments = ts.map(typeArgumentNodes, getTypeFromTypeNode);
                        mapper = createTypeMapper(typeParameters, typeArguments);
                    }
                    var typeArgument = typeArguments[i];
                    result = result && checkTypeAssignableTo(typeArgument, getTypeWithThisArgument(instantiateType(constraint, mapper), typeArgument), typeArgumentNodes[i], ts.Diagnostics.Type_0_does_not_satisfy_the_constraint_1);
                }
            }
            return result;
        }
        function checkTypeReferenceNode(node) {
            checkGrammarTypeArguments(node, node.typeArguments);
            var type = getTypeFromTypeReference(node);
            if (type !== unknownType && node.typeArguments) {
                // Do type argument local checks only if referenced type is successfully resolved
                ts.forEach(node.typeArguments, checkSourceElement);
                if (produceDiagnostics) {
                    var symbol = getNodeLinks(node).resolvedSymbol;
                    var typeParameters = symbol.flags & 524288 /* TypeAlias */ ? getSymbolLinks(symbol).typeParameters : type.target.localTypeParameters;
                    checkTypeArgumentConstraints(typeParameters, node.typeArguments);
                }
            }
        }
        function checkTypeQuery(node) {
            getTypeFromTypeQueryNode(node);
        }
        function checkTypeLiteral(node) {
            ts.forEach(node.members, checkSourceElement);
            if (produceDiagnostics) {
                var type = getTypeFromTypeLiteralOrFunctionOrConstructorTypeNode(node);
                checkIndexConstraints(type);
                checkTypeForDuplicateIndexSignatures(node);
            }
        }
        function checkArrayType(node) {
            checkSourceElement(node.elementType);
        }
        function checkTupleType(node) {
            // Grammar checking
            var hasErrorFromDisallowedTrailingComma = checkGrammarForDisallowedTrailingComma(node.elementTypes);
            if (!hasErrorFromDisallowedTrailingComma && node.elementTypes.length === 0) {
                grammarErrorOnNode(node, ts.Diagnostics.A_tuple_type_element_list_cannot_be_empty);
            }
            ts.forEach(node.elementTypes, checkSourceElement);
        }
        function checkUnionOrIntersectionType(node) {
            ts.forEach(node.types, checkSourceElement);
        }
        function isPrivateWithinAmbient(node) {
            return (node.flags & 16 /* Private */) && ts.isInAmbientContext(node);
        }
        function checkSpecializedSignatureDeclaration(signatureDeclarationNode) {
            if (!produceDiagnostics) {
                return;
            }
            var signature = getSignatureFromDeclaration(signatureDeclarationNode);
            if (!signature.hasStringLiterals) {
                return;
            }
            // TypeScript 1.0 spec (April 2014): 3.7.2.2
            // Specialized signatures are not permitted in conjunction with a function body
            if (ts.nodeIsPresent(signatureDeclarationNode.body)) {
                error(signatureDeclarationNode, ts.Diagnostics.A_signature_with_an_implementation_cannot_use_a_string_literal_type);
                return;
            }
            // TypeScript 1.0 spec (April 2014): 3.7.2.4
            // Every specialized call or construct signature in an object type must be assignable
            // to at least one non-specialized call or construct signature in the same object type
            var signaturesToCheck;
            // Unnamed (call\construct) signatures in interfaces are inherited and not shadowed so examining just node symbol won't give complete answer.
            // Use declaring type to obtain full list of signatures.
            if (!signatureDeclarationNode.name && signatureDeclarationNode.parent && signatureDeclarationNode.parent.kind === 218 /* InterfaceDeclaration */) {
                ts.Debug.assert(signatureDeclarationNode.kind === 148 /* CallSignature */ || signatureDeclarationNode.kind === 149 /* ConstructSignature */);
                var signatureKind = signatureDeclarationNode.kind === 148 /* CallSignature */ ? 0 /* Call */ : 1 /* Construct */;
                var containingSymbol = getSymbolOfNode(signatureDeclarationNode.parent);
                var containingType = getDeclaredTypeOfSymbol(containingSymbol);
                signaturesToCheck = getSignaturesOfType(containingType, signatureKind);
            }
            else {
                signaturesToCheck = getSignaturesOfSymbol(getSymbolOfNode(signatureDeclarationNode));
            }
            for (var _i = 0, signaturesToCheck_1 = signaturesToCheck; _i < signaturesToCheck_1.length; _i++) {
                var otherSignature = signaturesToCheck_1[_i];
                if (!otherSignature.hasStringLiterals && isSignatureAssignableTo(signature, otherSignature, /*ignoreReturnTypes*/ false)) {
                    return;
                }
            }
            error(signatureDeclarationNode, ts.Diagnostics.Specialized_overload_signature_is_not_assignable_to_any_non_specialized_signature);
        }
        function getEffectiveDeclarationFlags(n, flagsToCheck) {
            var flags = ts.getCombinedNodeFlags(n);
            // children of classes (even ambient classes) should not be marked as ambient or export
            // because those flags have no useful semantics there.
            if (n.parent.kind !== 218 /* InterfaceDeclaration */ &&
                n.parent.kind !== 217 /* ClassDeclaration */ &&
                n.parent.kind !== 189 /* ClassExpression */ &&
                ts.isInAmbientContext(n)) {
                if (!(flags & 4 /* Ambient */)) {
                    // It is nested in an ambient context, which means it is automatically exported
                    flags |= 2 /* Export */;
                }
                flags |= 4 /* Ambient */;
            }
            return flags & flagsToCheck;
        }
        function checkFunctionOrConstructorSymbol(symbol) {
            if (!produceDiagnostics) {
                return;
            }
            function getCanonicalOverload(overloads, implementation) {
                // Consider the canonical set of flags to be the flags of the bodyDeclaration or the first declaration
                // Error on all deviations from this canonical set of flags
                // The caveat is that if some overloads are defined in lib.d.ts, we don't want to
                // report the errors on those. To achieve this, we will say that the implementation is
                // the canonical signature only if it is in the same container as the first overload
                var implementationSharesContainerWithFirstOverload = implementation !== undefined && implementation.parent === overloads[0].parent;
                return implementationSharesContainerWithFirstOverload ? implementation : overloads[0];
            }
            function checkFlagAgreementBetweenOverloads(overloads, implementation, flagsToCheck, someOverloadFlags, allOverloadFlags) {
                // Error if some overloads have a flag that is not shared by all overloads. To find the
                // deviations, we XOR someOverloadFlags with allOverloadFlags
                var someButNotAllOverloadFlags = someOverloadFlags ^ allOverloadFlags;
                if (someButNotAllOverloadFlags !== 0) {
                    var canonicalFlags_1 = getEffectiveDeclarationFlags(getCanonicalOverload(overloads, implementation), flagsToCheck);
                    ts.forEach(overloads, function (o) {
                        var deviation = getEffectiveDeclarationFlags(o, flagsToCheck) ^ canonicalFlags_1;
                        if (deviation & 2 /* Export */) {
                            error(o.name, ts.Diagnostics.Overload_signatures_must_all_be_exported_or_not_exported);
                        }
                        else if (deviation & 4 /* Ambient */) {
                            error(o.name, ts.Diagnostics.Overload_signatures_must_all_be_ambient_or_non_ambient);
                        }
                        else if (deviation & (16 /* Private */ | 32 /* Protected */)) {
                            error(o.name, ts.Diagnostics.Overload_signatures_must_all_be_public_private_or_protected);
                        }
                        else if (deviation & 128 /* Abstract */) {
                            error(o.name, ts.Diagnostics.Overload_signatures_must_all_be_abstract_or_not_abstract);
                        }
                    });
                }
            }
            function checkQuestionTokenAgreementBetweenOverloads(overloads, implementation, someHaveQuestionToken, allHaveQuestionToken) {
                if (someHaveQuestionToken !== allHaveQuestionToken) {
                    var canonicalHasQuestionToken_1 = ts.hasQuestionToken(getCanonicalOverload(overloads, implementation));
                    ts.forEach(overloads, function (o) {
                        var deviation = ts.hasQuestionToken(o) !== canonicalHasQuestionToken_1;
                        if (deviation) {
                            error(o.name, ts.Diagnostics.Overload_signatures_must_all_be_optional_or_required);
                        }
                    });
                }
            }
            var flagsToCheck = 2 /* Export */ | 4 /* Ambient */ | 16 /* Private */ | 32 /* Protected */ | 128 /* Abstract */;
            var someNodeFlags = 0;
            var allNodeFlags = flagsToCheck;
            var someHaveQuestionToken = false;
            var allHaveQuestionToken = true;
            var hasOverloads = false;
            var bodyDeclaration;
            var lastSeenNonAmbientDeclaration;
            var previousDeclaration;
            var declarations = symbol.declarations;
            var isConstructor = (symbol.flags & 16384 /* Constructor */) !== 0;
            function reportImplementationExpectedError(node) {
                if (node.name && ts.nodeIsMissing(node.name)) {
                    return;
                }
                var seen = false;
                var subsequentNode = ts.forEachChild(node.parent, function (c) {
                    if (seen) {
                        return c;
                    }
                    else {
                        seen = c === node;
                    }
                });
                // We may be here because of some extra junk between overloads that could not be parsed into a valid node.
                // In this case the subsequent node is not really consecutive (.pos !== node.end), and we must ignore it here.
                if (subsequentNode && subsequentNode.pos === node.end) {
                    if (subsequentNode.kind === node.kind) {
                        var errorNode_1 = subsequentNode.name || subsequentNode;
                        // TODO(jfreeman): These are methods, so handle computed name case
                        if (node.name && subsequentNode.name && node.name.text === subsequentNode.name.text) {
                            var reportError = (node.kind === 144 /* MethodDeclaration */ || node.kind === 143 /* MethodSignature */) &&
                                (node.flags & 64 /* Static */) !== (subsequentNode.flags & 64 /* Static */);
                            // we can get here in two cases
                            // 1. mixed static and instance class members
                            // 2. something with the same name was defined before the set of overloads that prevents them from merging
                            // here we'll report error only for the first case since for second we should already report error in binder
                            if (reportError) {
                                var diagnostic = node.flags & 64 /* Static */ ? ts.Diagnostics.Function_overload_must_be_static : ts.Diagnostics.Function_overload_must_not_be_static;
                                error(errorNode_1, diagnostic);
                            }
                            return;
                        }
                        else if (ts.nodeIsPresent(subsequentNode.body)) {
                            error(errorNode_1, ts.Diagnostics.Function_implementation_name_must_be_0, ts.declarationNameToString(node.name));
                            return;
                        }
                    }
                }
                var errorNode = node.name || node;
                if (isConstructor) {
                    error(errorNode, ts.Diagnostics.Constructor_implementation_is_missing);
                }
                else {
                    // Report different errors regarding non-consecutive blocks of declarations depending on whether
                    // the node in question is abstract.
                    if (node.flags & 128 /* Abstract */) {
                        error(errorNode, ts.Diagnostics.All_declarations_of_an_abstract_method_must_be_consecutive);
                    }
                    else {
                        error(errorNode, ts.Diagnostics.Function_implementation_is_missing_or_not_immediately_following_the_declaration);
                    }
                }
            }
            // when checking exported function declarations across modules check only duplicate implementations
            // names and consistency of modifiers are verified when we check local symbol
            var isExportSymbolInsideModule = symbol.parent && symbol.parent.flags & 1536 /* Module */;
            var duplicateFunctionDeclaration = false;
            var multipleConstructorImplementation = false;
            for (var _i = 0, declarations_3 = declarations; _i < declarations_3.length; _i++) {
                var current = declarations_3[_i];
                var node = current;
                var inAmbientContext = ts.isInAmbientContext(node);
                var inAmbientContextOrInterface = node.parent.kind === 218 /* InterfaceDeclaration */ || node.parent.kind === 156 /* TypeLiteral */ || inAmbientContext;
                if (inAmbientContextOrInterface) {
                    // check if declarations are consecutive only if they are non-ambient
                    // 1. ambient declarations can be interleaved
                    // i.e. this is legal
                    //     declare function foo();
                    //     declare function bar();
                    //     declare function foo();
                    // 2. mixing ambient and non-ambient declarations is a separate error that will be reported - do not want to report an extra one
                    previousDeclaration = undefined;
                }
                if (node.kind === 216 /* FunctionDeclaration */ || node.kind === 144 /* MethodDeclaration */ || node.kind === 143 /* MethodSignature */ || node.kind === 145 /* Constructor */) {
                    var currentNodeFlags = getEffectiveDeclarationFlags(node, flagsToCheck);
                    someNodeFlags |= currentNodeFlags;
                    allNodeFlags &= currentNodeFlags;
                    someHaveQuestionToken = someHaveQuestionToken || ts.hasQuestionToken(node);
                    allHaveQuestionToken = allHaveQuestionToken && ts.hasQuestionToken(node);
                    if (ts.nodeIsPresent(node.body) && bodyDeclaration) {
                        if (isConstructor) {
                            multipleConstructorImplementation = true;
                        }
                        else {
                            duplicateFunctionDeclaration = true;
                        }
                    }
                    else if (!isExportSymbolInsideModule && previousDeclaration && previousDeclaration.parent === node.parent && previousDeclaration.end !== node.pos) {
                        reportImplementationExpectedError(previousDeclaration);
                    }
                    if (ts.nodeIsPresent(node.body)) {
                        if (!bodyDeclaration) {
                            bodyDeclaration = node;
                        }
                    }
                    else {
                        hasOverloads = true;
                    }
                    previousDeclaration = node;
                    if (!inAmbientContextOrInterface) {
                        lastSeenNonAmbientDeclaration = node;
                    }
                }
            }
            if (multipleConstructorImplementation) {
                ts.forEach(declarations, function (declaration) {
                    error(declaration, ts.Diagnostics.Multiple_constructor_implementations_are_not_allowed);
                });
            }
            if (duplicateFunctionDeclaration) {
                ts.forEach(declarations, function (declaration) {
                    error(declaration.name, ts.Diagnostics.Duplicate_function_implementation);
                });
            }
            // Abstract methods can't have an implementation -- in particular, they don't need one.
            if (!isExportSymbolInsideModule && lastSeenNonAmbientDeclaration && !lastSeenNonAmbientDeclaration.body &&
                !(lastSeenNonAmbientDeclaration.flags & 128 /* Abstract */)) {
                reportImplementationExpectedError(lastSeenNonAmbientDeclaration);
            }
            if (hasOverloads) {
                checkFlagAgreementBetweenOverloads(declarations, bodyDeclaration, flagsToCheck, someNodeFlags, allNodeFlags);
                checkQuestionTokenAgreementBetweenOverloads(declarations, bodyDeclaration, someHaveQuestionToken, allHaveQuestionToken);
                if (bodyDeclaration) {
                    var signatures = getSignaturesOfSymbol(symbol);
                    var bodySignature = getSignatureFromDeclaration(bodyDeclaration);
                    // If the implementation signature has string literals, we will have reported an error in
                    // checkSpecializedSignatureDeclaration
                    if (!bodySignature.hasStringLiterals) {
                        // TypeScript 1.0 spec (April 2014): 6.1
                        // If a function declaration includes overloads, the overloads determine the call
                        // signatures of the type given to the function object
                        // and the function implementation signature must be assignable to that type
                        //
                        // TypeScript 1.0 spec (April 2014): 3.8.4
                        // Note that specialized call and construct signatures (section 3.7.2.4) are not significant when determining assignment compatibility
                        // Consider checking against specialized signatures too. Not doing so creates a type hole:
                        //
                        // function g(x: "hi", y: boolean);
                        // function g(x: string, y: {});
                        // function g(x: string, y: string) { }
                        //
                        // The implementation is completely unrelated to the specialized signature, yet we do not check this.
                        for (var _a = 0, signatures_3 = signatures; _a < signatures_3.length; _a++) {
                            var signature = signatures_3[_a];
                            if (!signature.hasStringLiterals && !isImplementationCompatibleWithOverload(bodySignature, signature)) {
                                error(signature.declaration, ts.Diagnostics.Overload_signature_is_not_compatible_with_function_implementation);
                                break;
                            }
                        }
                    }
                }
            }
        }
        function checkExportsOnMergedDeclarations(node) {
            if (!produceDiagnostics) {
                return;
            }
            // if localSymbol is defined on node then node itself is exported - check is required
            var symbol = node.localSymbol;
            if (!symbol) {
                // local symbol is undefined => this declaration is non-exported.
                // however symbol might contain other declarations that are exported
                symbol = getSymbolOfNode(node);
                if (!(symbol.flags & 7340032 /* Export */)) {
                    // this is a pure local symbol (all declarations are non-exported) - no need to check anything
                    return;
                }
            }
            // run the check only for the first declaration in the list
            if (ts.getDeclarationOfKind(symbol, node.kind) !== node) {
                return;
            }
            // we use SymbolFlags.ExportValue, SymbolFlags.ExportType and SymbolFlags.ExportNamespace
            // to denote disjoint declarationSpaces (without making new enum type).
            var exportedDeclarationSpaces = 0 /* None */;
            var nonExportedDeclarationSpaces = 0 /* None */;
            var defaultExportedDeclarationSpaces = 0 /* None */;
            for (var _i = 0, _a = symbol.declarations; _i < _a.length; _i++) {
                var d = _a[_i];
                var declarationSpaces = getDeclarationSpaces(d);
                var effectiveDeclarationFlags = getEffectiveDeclarationFlags(d, 2 /* Export */ | 512 /* Default */);
                if (effectiveDeclarationFlags & 2 /* Export */) {
                    if (effectiveDeclarationFlags & 512 /* Default */) {
                        defaultExportedDeclarationSpaces |= declarationSpaces;
                    }
                    else {
                        exportedDeclarationSpaces |= declarationSpaces;
                    }
                }
                else {
                    nonExportedDeclarationSpaces |= declarationSpaces;
                }
            }
            // Spaces for anyting not declared a 'default export'.
            var nonDefaultExportedDeclarationSpaces = exportedDeclarationSpaces | nonExportedDeclarationSpaces;
            var commonDeclarationSpacesForExportsAndLocals = exportedDeclarationSpaces & nonExportedDeclarationSpaces;
            var commonDeclarationSpacesForDefaultAndNonDefault = defaultExportedDeclarationSpaces & nonDefaultExportedDeclarationSpaces;
            if (commonDeclarationSpacesForExportsAndLocals || commonDeclarationSpacesForDefaultAndNonDefault) {
                // declaration spaces for exported and non-exported declarations intersect
                for (var _b = 0, _c = symbol.declarations; _b < _c.length; _b++) {
                    var d = _c[_b];
                    var declarationSpaces = getDeclarationSpaces(d);
                    // Only error on the declarations that conributed to the intersecting spaces.
                    if (declarationSpaces & commonDeclarationSpacesForDefaultAndNonDefault) {
                        error(d.name, ts.Diagnostics.Merged_declaration_0_cannot_include_a_default_export_declaration_Consider_adding_a_separate_export_default_0_declaration_instead, ts.declarationNameToString(d.name));
                    }
                    else if (declarationSpaces & commonDeclarationSpacesForExportsAndLocals) {
                        error(d.name, ts.Diagnostics.Individual_declarations_in_merged_declaration_0_must_be_all_exported_or_all_local, ts.declarationNameToString(d.name));
                    }
                }
            }
            function getDeclarationSpaces(d) {
                switch (d.kind) {
                    case 218 /* InterfaceDeclaration */:
                        return 2097152 /* ExportType */;
                    case 221 /* ModuleDeclaration */:
                        return ts.isAmbientModule(d) || ts.getModuleInstanceState(d) !== 0 /* NonInstantiated */
                            ? 4194304 /* ExportNamespace */ | 1048576 /* ExportValue */
                            : 4194304 /* ExportNamespace */;
                    case 217 /* ClassDeclaration */:
                    case 220 /* EnumDeclaration */:
                        return 2097152 /* ExportType */ | 1048576 /* ExportValue */;
                    case 224 /* ImportEqualsDeclaration */:
                        var result_2 = 0;
                        var target = resolveAlias(getSymbolOfNode(d));
                        ts.forEach(target.declarations, function (d) { result_2 |= getDeclarationSpaces(d); });
                        return result_2;
                    default:
                        return 1048576 /* ExportValue */;
                }
            }
        }
        function checkNonThenableType(type, location, message) {
            type = getWidenedType(type);
            if (!isTypeAny(type) && isTypeAssignableTo(type, getGlobalThenableType())) {
                if (location) {
                    if (!message) {
                        message = ts.Diagnostics.Operand_for_await_does_not_have_a_valid_callable_then_member;
                    }
                    error(location, message);
                }
                return unknownType;
            }
            return type;
        }
        /**
          * Gets the "promised type" of a promise.
          * @param type The type of the promise.
          * @remarks The "promised type" of a type is the type of the "value" parameter of the "onfulfilled" callback.
          */
        function getPromisedType(promise) {
            //
            //  { // promise
            //      then( // thenFunction
            //          onfulfilled: ( // onfulfilledParameterType
            //              value: T // valueParameterType
            //          ) => any
            //      ): any;
            //  }
            //
            if (promise.flags & 1 /* Any */) {
                return undefined;
            }
            if ((promise.flags & 4096 /* Reference */) && promise.target === tryGetGlobalPromiseType()) {
                return promise.typeArguments[0];
            }
            var globalPromiseLikeType = getInstantiatedGlobalPromiseLikeType();
            if (globalPromiseLikeType === emptyObjectType || !isTypeAssignableTo(promise, globalPromiseLikeType)) {
                return undefined;
            }
            var thenFunction = getTypeOfPropertyOfType(promise, "then");
            if (thenFunction && (thenFunction.flags & 1 /* Any */)) {
                return undefined;
            }
            var thenSignatures = thenFunction ? getSignaturesOfType(thenFunction, 0 /* Call */) : emptyArray;
            if (thenSignatures.length === 0) {
                return undefined;
            }
            var onfulfilledParameterType = getUnionType(ts.map(thenSignatures, getTypeOfFirstParameterOfSignature));
            if (onfulfilledParameterType.flags & 1 /* Any */) {
                return undefined;
            }
            var onfulfilledParameterSignatures = getSignaturesOfType(onfulfilledParameterType, 0 /* Call */);
            if (onfulfilledParameterSignatures.length === 0) {
                return undefined;
            }
            var valueParameterType = getUnionType(ts.map(onfulfilledParameterSignatures, getTypeOfFirstParameterOfSignature));
            return valueParameterType;
        }
        function getTypeOfFirstParameterOfSignature(signature) {
            return getTypeAtPosition(signature, 0);
        }
        /**
          * Gets the "awaited type" of a type.
          * @param type The type to await.
          * @remarks The "awaited type" of an expression is its "promised type" if the expression is a
          * Promise-like type; otherwise, it is the type of the expression. This is used to reflect
          * The runtime behavior of the `await` keyword.
          */
        function getAwaitedType(type) {
            return checkAwaitedType(type, /*location*/ undefined, /*message*/ undefined);
        }
        function checkAwaitedType(type, location, message) {
            return checkAwaitedTypeWorker(type);
            function checkAwaitedTypeWorker(type) {
                if (type.flags & 16384 /* Union */) {
                    var types = [];
                    for (var _i = 0, _a = type.types; _i < _a.length; _i++) {
                        var constituentType = _a[_i];
                        types.push(checkAwaitedTypeWorker(constituentType));
                    }
                    return getUnionType(types);
                }
                else {
                    var promisedType = getPromisedType(type);
                    if (promisedType === undefined) {
                        // The type was not a PromiseLike, so it could not be unwrapped any further.
                        // As long as the type does not have a callable "then" property, it is
                        // safe to return the type; otherwise, an error will have been reported in
                        // the call to checkNonThenableType and we will return unknownType.
                        //
                        // An example of a non-promise "thenable" might be:
                        //
                        //  await { then(): void {} }
                        //
                        // The "thenable" does not match the minimal definition for a PromiseLike. When
                        // a Promise/A+-compatible or ES6 promise tries to adopt this value, the promise
                        // will never settle. We treat this as an error to help flag an early indicator
                        // of a runtime problem. If the user wants to return this value from an async
                        // function, they would need to wrap it in some other value. If they want it to
                        // be treated as a promise, they can cast to <any>.
                        return checkNonThenableType(type, location, message);
                    }
                    else {
                        if (type.id === promisedType.id || awaitedTypeStack.indexOf(promisedType.id) >= 0) {
                            // We have a bad actor in the form of a promise whose promised type is
                            // the same promise type, or a mutually recursive promise. Return the
                            // unknown type as we cannot guess the shape. If this were the actual
                            // case in the JavaScript, this Promise would never resolve.
                            //
                            // An example of a bad actor with a singly-recursive promise type might
                            // be:
                            //
                            //  interface BadPromise {
                            //      then(
                            //          onfulfilled: (value: BadPromise) => any,
                            //          onrejected: (error: any) => any): BadPromise;
                            //  }
                            //
                            // The above interface will pass the PromiseLike check, and return a
                            // promised type of `BadPromise`. Since this is a self reference, we
                            // don't want to keep recursing ad infinitum.
                            //
                            // An example of a bad actor in the form of a mutually-recursive
                            // promise type might be:
                            //
                            //  interface BadPromiseA {
                            //      then(
                            //          onfulfilled: (value: BadPromiseB) => any,
                            //          onrejected: (error: any) => any): BadPromiseB;
                            //  }
                            //
                            //  interface BadPromiseB {
                            //      then(
                            //          onfulfilled: (value: BadPromiseA) => any,
                            //          onrejected: (error: any) => any): BadPromiseA;
                            //  }
                            //
                            if (location) {
                                error(location, ts.Diagnostics._0_is_referenced_directly_or_indirectly_in_the_fulfillment_callback_of_its_own_then_method, symbolToString(type.symbol));
                            }
                            return unknownType;
                        }
                        // Keep track of the type we're about to unwrap to avoid bad recursive promise types.
                        // See the comments above for more information.
                        awaitedTypeStack.push(type.id);
                        var awaitedType = checkAwaitedTypeWorker(promisedType);
                        awaitedTypeStack.pop();
                        return awaitedType;
                    }
                }
            }
        }
        /**
         * Checks that the return type provided is an instantiation of the global Promise<T> type
         * and returns the awaited type of the return type.
         *
         * @param returnType The return type of a FunctionLikeDeclaration
         * @param location The node on which to report the error.
         */
        function checkCorrectPromiseType(returnType, location) {
            if (returnType === unknownType) {
                // The return type already had some other error, so we ignore and return
                // the unknown type.
                return unknownType;
            }
            var globalPromiseType = getGlobalPromiseType();
            if (globalPromiseType === emptyGenericType
                || globalPromiseType === getTargetType(returnType)) {
                // Either we couldn't resolve the global promise type, which would have already
                // reported an error, or we could resolve it and the return type is a valid type
                // reference to the global type. In either case, we return the awaited type for
                // the return type.
                return checkAwaitedType(returnType, location, ts.Diagnostics.An_async_function_or_method_must_have_a_valid_awaitable_return_type);
            }
            // The promise type was not a valid type reference to the global promise type, so we
            // report an error and return the unknown type.
            error(location, ts.Diagnostics.The_return_type_of_an_async_function_or_method_must_be_the_global_Promise_T_type);
            return unknownType;
        }
        /**
          * Checks the return type of an async function to ensure it is a compatible
          * Promise implementation.
          * @param node The signature to check
          * @param returnType The return type for the function
          * @remarks
          * This checks that an async function has a valid Promise-compatible return type,
          * and returns the *awaited type* of the promise. An async function has a valid
          * Promise-compatible return type if the resolved value of the return type has a
          * construct signature that takes in an `initializer` function that in turn supplies
          * a `resolve` function as one of its arguments and results in an object with a
          * callable `then` signature.
          */
        function checkAsyncFunctionReturnType(node) {
            if (compilerOptions.noCustomAsyncPromise && languageVersion >= 2 /* ES6 */) {
                var returnType = getTypeFromTypeNode(node.type);
                return checkCorrectPromiseType(returnType, node.type);
            }
            var globalPromiseConstructorLikeType = getGlobalPromiseConstructorLikeType();
            if (globalPromiseConstructorLikeType === emptyObjectType) {
                // If we couldn't resolve the global PromiseConstructorLike type we cannot verify
                // compatibility with __awaiter.
                return unknownType;
            }
            // As part of our emit for an async function, we will need to emit the entity name of
            // the return type annotation as an expression. To meet the necessary runtime semantics
            // for __awaiter, we must also check that the type of the declaration (e.g. the static
            // side or "constructor" of the promise type) is compatible `PromiseConstructorLike`.
            //
            // An example might be (from lib.es6.d.ts):
            //
            //  interface Promise<T> { ... }
            //  interface PromiseConstructor {
            //      new <T>(...): Promise<T>;
            //  }
            //  declare var Promise: PromiseConstructor;
            //
            // When an async function declares a return type annotation of `Promise<T>`, we
            // need to get the type of the `Promise` variable declaration above, which would
            // be `PromiseConstructor`.
            //
            // The same case applies to a class:
            //
            //  declare class Promise<T> {
            //      constructor(...);
            //      then<U>(...): Promise<U>;
            //  }
            //
            // When we get the type of the `Promise` symbol here, we get the type of the static
            // side of the `Promise` class, which would be `{ new <T>(...): Promise<T> }`.
            var promiseType = getTypeFromTypeNode(node.type);
            if (promiseType === unknownType && compilerOptions.isolatedModules) {
                // If we are compiling with isolatedModules, we may not be able to resolve the
                // type as a value. As such, we will just return unknownType;
                return unknownType;
            }
            var promiseConstructor = getNodeLinks(node.type).resolvedSymbol;
            if (!promiseConstructor || !symbolIsValue(promiseConstructor)) {
                var typeName = promiseConstructor
                    ? symbolToString(promiseConstructor)
                    : typeToString(promiseType);
                error(node, ts.Diagnostics.Type_0_is_not_a_valid_async_function_return_type, typeName);
                return unknownType;
            }
            // If the Promise constructor, resolved locally, is an alias symbol we should mark it as referenced.
            checkReturnTypeAnnotationAsExpression(node);
            // Validate the promise constructor type.
            var promiseConstructorType = getTypeOfSymbol(promiseConstructor);
            if (!checkTypeAssignableTo(promiseConstructorType, globalPromiseConstructorLikeType, node, ts.Diagnostics.Type_0_is_not_a_valid_async_function_return_type)) {
                return unknownType;
            }
            // Verify there is no local declaration that could collide with the promise constructor.
            var promiseName = ts.getEntityNameFromTypeNode(node.type);
            var promiseNameOrNamespaceRoot = getFirstIdentifier(promiseName);
            var rootSymbol = getSymbol(node.locals, promiseNameOrNamespaceRoot.text, 107455 /* Value */);
            if (rootSymbol) {
                error(rootSymbol.valueDeclaration, ts.Diagnostics.Duplicate_identifier_0_Compiler_uses_declaration_1_to_support_async_functions, promiseNameOrNamespaceRoot.text, getFullyQualifiedName(promiseConstructor));
                return unknownType;
            }
            // Get and return the awaited type of the return type.
            return checkAwaitedType(promiseType, node, ts.Diagnostics.An_async_function_or_method_must_have_a_valid_awaitable_return_type);
        }
        /** Check a decorator */
        function checkDecorator(node) {
            var signature = getResolvedSignature(node);
            var returnType = getReturnTypeOfSignature(signature);
            if (returnType.flags & 1 /* Any */) {
                return;
            }
            var expectedReturnType;
            var headMessage = getDiagnosticHeadMessageForDecoratorResolution(node);
            var errorInfo;
            switch (node.parent.kind) {
                case 217 /* ClassDeclaration */:
                    var classSymbol = getSymbolOfNode(node.parent);
                    var classConstructorType = getTypeOfSymbol(classSymbol);
                    expectedReturnType = getUnionType([classConstructorType, voidType]);
                    break;
                case 139 /* Parameter */:
                    expectedReturnType = voidType;
                    errorInfo = ts.chainDiagnosticMessages(errorInfo, ts.Diagnostics.The_return_type_of_a_parameter_decorator_function_must_be_either_void_or_any);
                    break;
                case 142 /* PropertyDeclaration */:
                    expectedReturnType = voidType;
                    errorInfo = ts.chainDiagnosticMessages(errorInfo, ts.Diagnostics.The_return_type_of_a_property_decorator_function_must_be_either_void_or_any);
                    break;
                case 144 /* MethodDeclaration */:
                case 146 /* GetAccessor */:
                case 147 /* SetAccessor */:
                    var methodType = getTypeOfNode(node.parent);
                    var descriptorType = createTypedPropertyDescriptorType(methodType);
                    expectedReturnType = getUnionType([descriptorType, voidType]);
                    break;
            }
            checkTypeAssignableTo(returnType, expectedReturnType, node, headMessage, errorInfo);
        }
        /** Checks a type reference node as an expression. */
        function checkTypeNodeAsExpression(node) {
            // When we are emitting type metadata for decorators, we need to try to check the type
            // as if it were an expression so that we can emit the type in a value position when we
            // serialize the type metadata.
            if (node && node.kind === 152 /* TypeReference */) {
                var root = getFirstIdentifier(node.typeName);
                var meaning = root.parent.kind === 152 /* TypeReference */ ? 793056 /* Type */ : 1536 /* Namespace */;
                // Resolve type so we know which symbol is referenced
                var rootSymbol = resolveName(root, root.text, meaning | 8388608 /* Alias */, /*nameNotFoundMessage*/ undefined, /*nameArg*/ undefined);
                // Resolved symbol is alias
                if (rootSymbol && rootSymbol.flags & 8388608 /* Alias */) {
                    var aliasTarget = resolveAlias(rootSymbol);
                    // If alias has value symbol - mark alias as referenced
                    if (aliasTarget.flags & 107455 /* Value */ && !isConstEnumOrConstEnumOnlyModule(resolveAlias(rootSymbol))) {
                        markAliasSymbolAsReferenced(rootSymbol);
                    }
                }
            }
        }
        /**
          * Checks the type annotation of an accessor declaration or property declaration as
          * an expression if it is a type reference to a type with a value declaration.
          */
        function checkTypeAnnotationAsExpression(node) {
            checkTypeNodeAsExpression(node.type);
        }
        function checkReturnTypeAnnotationAsExpression(node) {
            checkTypeNodeAsExpression(node.type);
        }
        /** Checks the type annotation of the parameters of a function/method or the constructor of a class as expressions */
        function checkParameterTypeAnnotationsAsExpressions(node) {
            // ensure all type annotations with a value declaration are checked as an expression
            for (var _i = 0, _a = node.parameters; _i < _a.length; _i++) {
                var parameter = _a[_i];
                checkTypeAnnotationAsExpression(parameter);
            }
        }
        /** Check the decorators of a node */
        function checkDecorators(node) {
            if (!node.decorators) {
                return;
            }
            // skip this check for nodes that cannot have decorators. These should have already had an error reported by
            // checkGrammarDecorators.
            if (!ts.nodeCanBeDecorated(node)) {
                return;
            }
            if (!compilerOptions.experimentalDecorators) {
                error(node, ts.Diagnostics.Experimental_support_for_decorators_is_a_feature_that_is_subject_to_change_in_a_future_release_Set_the_experimentalDecorators_option_to_remove_this_warning);
            }
            if (compilerOptions.emitDecoratorMetadata) {
                // we only need to perform these checks if we are emitting serialized type metadata for the target of a decorator.
                switch (node.kind) {
                    case 217 /* ClassDeclaration */:
                        var constructor = ts.getFirstConstructorWithBody(node);
                        if (constructor) {
                            checkParameterTypeAnnotationsAsExpressions(constructor);
                        }
                        break;
                    case 144 /* MethodDeclaration */:
                    case 146 /* GetAccessor */:
                    case 147 /* SetAccessor */:
                        checkParameterTypeAnnotationsAsExpressions(node);
                        checkReturnTypeAnnotationAsExpression(node);
                        break;
                    case 142 /* PropertyDeclaration */:
                    case 139 /* Parameter */:
                        checkTypeAnnotationAsExpression(node);
                        break;
                }
            }
            ts.forEach(node.decorators, checkDecorator);
        }
        function checkFunctionDeclaration(node) {
            if (produceDiagnostics) {
                checkFunctionOrMethodDeclaration(node) || checkGrammarForGenerator(node);
                checkCollisionWithCapturedSuperVariable(node, node.name);
                checkCollisionWithCapturedThisVariable(node, node.name);
                checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
                checkCollisionWithGlobalPromiseInGeneratedCode(node, node.name);
            }
        }
        function checkFunctionOrMethodDeclaration(node) {
            checkDecorators(node);
            checkSignatureDeclaration(node);
            var isAsync = ts.isAsyncFunctionLike(node);
            // Do not use hasDynamicName here, because that returns false for well known symbols.
            // We want to perform checkComputedPropertyName for all computed properties, including
            // well known symbols.
            if (node.name && node.name.kind === 137 /* ComputedPropertyName */) {
                // This check will account for methods in class/interface declarations,
                // as well as accessors in classes/object literals
                checkComputedPropertyName(node.name);
            }
            if (!ts.hasDynamicName(node)) {
                // first we want to check the local symbol that contain this declaration
                // - if node.localSymbol !== undefined - this is current declaration is exported and localSymbol points to the local symbol
                // - if node.localSymbol === undefined - this node is non-exported so we can just pick the result of getSymbolOfNode
                var symbol = getSymbolOfNode(node);
                var localSymbol = node.localSymbol || symbol;
                // Since the javascript won't do semantic analysis like typescript,
                // if the javascript file comes before the typescript file and both contain same name functions,
                // checkFunctionOrConstructorSymbol wouldn't be called if we didnt ignore javascript function.
                var firstDeclaration = ts.forEach(localSymbol.declarations, 
                // Get first non javascript function declaration
                function (declaration) { return declaration.kind === node.kind && !ts.isSourceFileJavaScript(ts.getSourceFileOfNode(declaration)) ?
                    declaration : undefined; });
                // Only type check the symbol once
                if (node === firstDeclaration) {
                    checkFunctionOrConstructorSymbol(localSymbol);
                }
                if (symbol.parent) {
                    // run check once for the first declaration
                    if (ts.getDeclarationOfKind(symbol, node.kind) === node) {
                        // run check on export symbol to check that modifiers agree across all exported declarations
                        checkFunctionOrConstructorSymbol(symbol);
                    }
                }
            }
            checkSourceElement(node.body);
            if (!node.asteriskToken) {
                var returnOrPromisedType = node.type && (isAsync ? checkAsyncFunctionReturnType(node) : getTypeFromTypeNode(node.type));
                checkAllCodePathsInNonVoidFunctionReturnOrThrow(node, returnOrPromisedType);
            }
            if (produceDiagnostics && !node.type) {
                // Report an implicit any error if there is no body, no explicit return type, and node is not a private method
                // in an ambient context
                if (compilerOptions.noImplicitAny && ts.nodeIsMissing(node.body) && !isPrivateWithinAmbient(node)) {
                    reportImplicitAnyError(node, anyType);
                }
                if (node.asteriskToken && ts.nodeIsPresent(node.body)) {
                    // A generator with a body and no type annotation can still cause errors. It can error if the
                    // yielded values have no common supertype, or it can give an implicit any error if it has no
                    // yielded values. The only way to trigger these errors is to try checking its return type.
                    getReturnTypeOfSignature(getSignatureFromDeclaration(node));
                }
            }
        }
        function checkBlock(node) {
            // Grammar checking for SyntaxKind.Block
            if (node.kind === 195 /* Block */) {
                checkGrammarStatementInAmbientContext(node);
            }
            ts.forEach(node.statements, checkSourceElement);
        }
        function checkCollisionWithArgumentsInGeneratedCode(node) {
            // no rest parameters \ declaration context \ overload - no codegen impact
            if (!ts.hasRestParameter(node) || ts.isInAmbientContext(node) || ts.nodeIsMissing(node.body)) {
                return;
            }
            ts.forEach(node.parameters, function (p) {
                if (p.name && !ts.isBindingPattern(p.name) && p.name.text === argumentsSymbol.name) {
                    error(p, ts.Diagnostics.Duplicate_identifier_arguments_Compiler_uses_arguments_to_initialize_rest_parameters);
                }
            });
        }
        function needCollisionCheckForIdentifier(node, identifier, name) {
            if (!(identifier && identifier.text === name)) {
                return false;
            }
            if (node.kind === 142 /* PropertyDeclaration */ ||
                node.kind === 141 /* PropertySignature */ ||
                node.kind === 144 /* MethodDeclaration */ ||
                node.kind === 143 /* MethodSignature */ ||
                node.kind === 146 /* GetAccessor */ ||
                node.kind === 147 /* SetAccessor */) {
                // it is ok to have member named '_super' or '_this' - member access is always qualified
                return false;
            }
            if (ts.isInAmbientContext(node)) {
                // ambient context - no codegen impact
                return false;
            }
            var root = ts.getRootDeclaration(node);
            if (root.kind === 139 /* Parameter */ && ts.nodeIsMissing(root.parent.body)) {
                // just an overload - no codegen impact
                return false;
            }
            return true;
        }
        function checkCollisionWithCapturedThisVariable(node, name) {
            if (needCollisionCheckForIdentifier(node, name, "_this")) {
                potentialThisCollisions.push(node);
            }
        }
        // this function will run after checking the source file so 'CaptureThis' is correct for all nodes
        function checkIfThisIsCapturedInEnclosingScope(node) {
            var current = node;
            while (current) {
                if (getNodeCheckFlags(current) & 4 /* CaptureThis */) {
                    var isDeclaration_1 = node.kind !== 69 /* Identifier */;
                    if (isDeclaration_1) {
                        error(node.name, ts.Diagnostics.Duplicate_identifier_this_Compiler_uses_variable_declaration_this_to_capture_this_reference);
                    }
                    else {
                        error(node, ts.Diagnostics.Expression_resolves_to_variable_declaration_this_that_compiler_uses_to_capture_this_reference);
                    }
                    return;
                }
                current = current.parent;
            }
        }
        function checkCollisionWithCapturedSuperVariable(node, name) {
            if (!needCollisionCheckForIdentifier(node, name, "_super")) {
                return;
            }
            // bubble up and find containing type
            var enclosingClass = ts.getContainingClass(node);
            // if containing type was not found or it is ambient - exit (no codegen)
            if (!enclosingClass || ts.isInAmbientContext(enclosingClass)) {
                return;
            }
            if (ts.getClassExtendsHeritageClauseElement(enclosingClass)) {
                var isDeclaration_2 = node.kind !== 69 /* Identifier */;
                if (isDeclaration_2) {
                    error(node, ts.Diagnostics.Duplicate_identifier_super_Compiler_uses_super_to_capture_base_class_reference);
                }
                else {
                    error(node, ts.Diagnostics.Expression_resolves_to_super_that_compiler_uses_to_capture_base_class_reference);
                }
            }
        }
        function checkCollisionWithRequireExportsInGeneratedCode(node, name) {
            if (!needCollisionCheckForIdentifier(node, name, "require") && !needCollisionCheckForIdentifier(node, name, "exports")) {
                return;
            }
            // Uninstantiated modules shouldnt do this check
            if (node.kind === 221 /* ModuleDeclaration */ && ts.getModuleInstanceState(node) !== 1 /* Instantiated */) {
                return;
            }
            // In case of variable declaration, node.parent is variable statement so look at the variable statement's parent
            var parent = getDeclarationContainer(node);
            if (parent.kind === 251 /* SourceFile */ && ts.isExternalOrCommonJsModule(parent)) {
                // If the declaration happens to be in external module, report error that require and exports are reserved keywords
                error(name, ts.Diagnostics.Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module, ts.declarationNameToString(name), ts.declarationNameToString(name));
            }
        }
        function checkCollisionWithGlobalPromiseInGeneratedCode(node, name) {
            if (!compilerOptions.noCustomAsyncPromise) {
                return;
            }
            if (!needCollisionCheckForIdentifier(node, name, "Promise")) {
                return;
            }
            // Uninstantiated modules shouldnt do this check
            if (node.kind === 221 /* ModuleDeclaration */ && ts.getModuleInstanceState(node) !== 1 /* Instantiated */) {
                return;
            }
            // In case of variable declaration, node.parent is variable statement so look at the variable statement's parent
            var parent = getDeclarationContainer(node);
            if (parent.kind === 251 /* SourceFile */ && ts.isExternalOrCommonJsModule(parent) && parent.flags & 33554432 /* HasAsyncFunctions */) {
                // If the declaration happens to be in external module, report error that Promise is a reserved identifier.
                error(name, ts.Diagnostics.Duplicate_identifier_0_Compiler_reserves_name_1_in_top_level_scope_of_a_module_containing_async_functions, ts.declarationNameToString(name), ts.declarationNameToString(name));
            }
        }
        function checkVarDeclaredNamesNotShadowed(node) {
            // - ScriptBody : StatementList
            // It is a Syntax Error if any element of the LexicallyDeclaredNames of StatementList
            // also occurs in the VarDeclaredNames of StatementList.
            // - Block : { StatementList }
            // It is a Syntax Error if any element of the LexicallyDeclaredNames of StatementList
            // also occurs in the VarDeclaredNames of StatementList.
            // Variable declarations are hoisted to the top of their function scope. They can shadow
            // block scoped declarations, which bind tighter. this will not be flagged as duplicate definition
            // by the binder as the declaration scope is different.
            // A non-initialized declaration is a no-op as the block declaration will resolve before the var
            // declaration. the problem is if the declaration has an initializer. this will act as a write to the
            // block declared value. this is fine for let, but not const.
            // Only consider declarations with initializers, uninitialized const declarations will not
            // step on a let/const variable.
            // Do not consider const and const declarations, as duplicate block-scoped declarations
            // are handled by the binder.
            // We are only looking for const declarations that step on let\const declarations from a
            // different scope. e.g.:
            //      {
            //          const x = 0; // localDeclarationSymbol obtained after name resolution will correspond to this declaration
            //          const x = 0; // symbol for this declaration will be 'symbol'
            //      }
            // skip block-scoped variables and parameters
            if ((ts.getCombinedNodeFlags(node) & 24576 /* BlockScoped */) !== 0 || ts.isParameterDeclaration(node)) {
                return;
            }
            // skip variable declarations that don't have initializers
            // NOTE: in ES6 spec initializer is required in variable declarations where name is binding pattern
            // so we'll always treat binding elements as initialized
            if (node.kind === 214 /* VariableDeclaration */ && !node.initializer) {
                return;
            }
            var symbol = getSymbolOfNode(node);
            if (symbol.flags & 1 /* FunctionScopedVariable */) {
                var localDeclarationSymbol = resolveName(node, node.name.text, 3 /* Variable */, /*nodeNotFoundErrorMessage*/ undefined, /*nameArg*/ undefined);
                if (localDeclarationSymbol &&
                    localDeclarationSymbol !== symbol &&
                    localDeclarationSymbol.flags & 2 /* BlockScopedVariable */) {
                    if (getDeclarationFlagsFromSymbol(localDeclarationSymbol) & 24576 /* BlockScoped */) {
                        var varDeclList = ts.getAncestor(localDeclarationSymbol.valueDeclaration, 215 /* VariableDeclarationList */);
                        var container = varDeclList.parent.kind === 196 /* VariableStatement */ && varDeclList.parent.parent
                            ? varDeclList.parent.parent
                            : undefined;
                        // names of block-scoped and function scoped variables can collide only
                        // if block scoped variable is defined in the function\module\source file scope (because of variable hoisting)
                        var namesShareScope = container &&
                            (container.kind === 195 /* Block */ && ts.isFunctionLike(container.parent) ||
                                container.kind === 222 /* ModuleBlock */ ||
                                container.kind === 221 /* ModuleDeclaration */ ||
                                container.kind === 251 /* SourceFile */);
                        // here we know that function scoped variable is shadowed by block scoped one
                        // if they are defined in the same scope - binder has already reported redeclaration error
                        // otherwise if variable has an initializer - show error that initialization will fail
                        // since LHS will be block scoped name instead of function scoped
                        if (!namesShareScope) {
                            var name_8 = symbolToString(localDeclarationSymbol);
                            error(node, ts.Diagnostics.Cannot_initialize_outer_scoped_variable_0_in_the_same_scope_as_block_scoped_declaration_1, name_8, name_8);
                        }
                    }
                }
            }
        }
        // Check that a parameter initializer contains no references to parameters declared to the right of itself
        function checkParameterInitializer(node) {
            if (ts.getRootDeclaration(node).kind !== 139 /* Parameter */) {
                return;
            }
            var func = ts.getContainingFunction(node);
            visit(node.initializer);
            function visit(n) {
                if (n.kind === 69 /* Identifier */) {
                    var referencedSymbol = getNodeLinks(n).resolvedSymbol;
                    // check FunctionLikeDeclaration.locals (stores parameters\function local variable)
                    // if it contains entry with a specified name and if this entry matches the resolved symbol
                    if (referencedSymbol && referencedSymbol !== unknownSymbol && getSymbol(func.locals, referencedSymbol.name, 107455 /* Value */) === referencedSymbol) {
                        if (referencedSymbol.valueDeclaration.kind === 139 /* Parameter */) {
                            if (referencedSymbol.valueDeclaration === node) {
                                error(n, ts.Diagnostics.Parameter_0_cannot_be_referenced_in_its_initializer, ts.declarationNameToString(node.name));
                                return;
                            }
                            if (referencedSymbol.valueDeclaration.pos < node.pos) {
                                // legal case - parameter initializer references some parameter strictly on left of current parameter declaration
                                return;
                            }
                        }
                        error(n, ts.Diagnostics.Initializer_of_parameter_0_cannot_reference_identifier_1_declared_after_it, ts.declarationNameToString(node.name), ts.declarationNameToString(n));
                    }
                }
                else {
                    ts.forEachChild(n, visit);
                }
            }
        }
        // Check variable, parameter, or property declaration
        function checkVariableLikeDeclaration(node) {
            checkDecorators(node);
            checkSourceElement(node.type);
            // For a computed property, just check the initializer and exit
            // Do not use hasDynamicName here, because that returns false for well known symbols.
            // We want to perform checkComputedPropertyName for all computed properties, including
            // well known symbols.
            if (node.name.kind === 137 /* ComputedPropertyName */) {
                checkComputedPropertyName(node.name);
                if (node.initializer) {
                    checkExpressionCached(node.initializer);
                }
            }
            if (node.kind === 166 /* BindingElement */) {
                // check computed properties inside property names of binding elements
                if (node.propertyName && node.propertyName.kind === 137 /* ComputedPropertyName */) {
                    checkComputedPropertyName(node.propertyName);
                }
            }
            // For a binding pattern, check contained binding elements
            if (ts.isBindingPattern(node.name)) {
                ts.forEach(node.name.elements, checkSourceElement);
            }
            // For a parameter declaration with an initializer, error and exit if the containing function doesn't have a body
            if (node.initializer && ts.getRootDeclaration(node).kind === 139 /* Parameter */ && ts.nodeIsMissing(ts.getContainingFunction(node).body)) {
                error(node, ts.Diagnostics.A_parameter_initializer_is_only_allowed_in_a_function_or_constructor_implementation);
                return;
            }
            // For a binding pattern, validate the initializer and exit
            if (ts.isBindingPattern(node.name)) {
                // Don't validate for-in initializer as it is already an error
                if (node.initializer && node.parent.parent.kind !== 203 /* ForInStatement */) {
                    checkTypeAssignableTo(checkExpressionCached(node.initializer), getWidenedTypeForVariableLikeDeclaration(node), node, /*headMessage*/ undefined);
                    checkParameterInitializer(node);
                }
                return;
            }
            var symbol = getSymbolOfNode(node);
            var type = getTypeOfVariableOrParameterOrProperty(symbol);
            if (node === symbol.valueDeclaration) {
                // Node is the primary declaration of the symbol, just validate the initializer
                // Don't validate for-in initializer as it is already an error
                if (node.initializer && node.parent.parent.kind !== 203 /* ForInStatement */) {
                    checkTypeAssignableTo(checkExpressionCached(node.initializer), type, node, /*headMessage*/ undefined);
                    checkParameterInitializer(node);
                }
            }
            else {
                // Node is a secondary declaration, check that type is identical to primary declaration and check that
                // initializer is consistent with type associated with the node
                var declarationType = getWidenedTypeForVariableLikeDeclaration(node);
                if (type !== unknownType && declarationType !== unknownType && !isTypeIdenticalTo(type, declarationType)) {
                    error(node.name, ts.Diagnostics.Subsequent_variable_declarations_must_have_the_same_type_Variable_0_must_be_of_type_1_but_here_has_type_2, ts.declarationNameToString(node.name), typeToString(type), typeToString(declarationType));
                }
                if (node.initializer) {
                    checkTypeAssignableTo(checkExpressionCached(node.initializer), declarationType, node, /*headMessage*/ undefined);
                }
            }
            if (node.kind !== 142 /* PropertyDeclaration */ && node.kind !== 141 /* PropertySignature */) {
                // We know we don't have a binding pattern or computed name here
                checkExportsOnMergedDeclarations(node);
                if (node.kind === 214 /* VariableDeclaration */ || node.kind === 166 /* BindingElement */) {
                    checkVarDeclaredNamesNotShadowed(node);
                }
                checkCollisionWithCapturedSuperVariable(node, node.name);
                checkCollisionWithCapturedThisVariable(node, node.name);
                checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
                checkCollisionWithGlobalPromiseInGeneratedCode(node, node.name);
            }
        }
        function checkVariableDeclaration(node) {
            checkGrammarVariableDeclaration(node);
            return checkVariableLikeDeclaration(node);
        }
        function checkBindingElement(node) {
            checkGrammarBindingElement(node);
            return checkVariableLikeDeclaration(node);
        }
        function checkVariableStatement(node) {
            // Grammar checking
            checkGrammarDecorators(node) || checkGrammarModifiers(node) || checkGrammarVariableDeclarationList(node.declarationList) || checkGrammarForDisallowedLetOrConstStatement(node);
            ts.forEach(node.declarationList.declarations, checkSourceElement);
        }
        function checkGrammarDisallowedModifiersOnObjectLiteralExpressionMethod(node) {
            // We only disallow modifier on a method declaration if it is a property of object-literal-expression
            if (node.modifiers && node.parent.kind === 168 /* ObjectLiteralExpression */) {
                if (ts.isAsyncFunctionLike(node)) {
                    if (node.modifiers.length > 1) {
                        return grammarErrorOnFirstToken(node, ts.Diagnostics.Modifiers_cannot_appear_here);
                    }
                }
                else {
                    return grammarErrorOnFirstToken(node, ts.Diagnostics.Modifiers_cannot_appear_here);
                }
            }
        }
        function checkExpressionStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node);
            checkExpression(node.expression);
        }
        function checkIfStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node);
            checkExpression(node.expression);
            checkSourceElement(node.thenStatement);
            if (node.thenStatement.kind === 197 /* EmptyStatement */) {
                error(node.thenStatement, ts.Diagnostics.The_body_of_an_if_statement_cannot_be_the_empty_statement);
            }
            checkSourceElement(node.elseStatement);
        }
        function checkDoStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node);
            checkSourceElement(node.statement);
            checkExpression(node.expression);
        }
        function checkWhileStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node);
            checkExpression(node.expression);
            checkSourceElement(node.statement);
        }
        function checkForStatement(node) {
            // Grammar checking
            if (!checkGrammarStatementInAmbientContext(node)) {
                if (node.initializer && node.initializer.kind === 215 /* VariableDeclarationList */) {
                    checkGrammarVariableDeclarationList(node.initializer);
                }
            }
            if (node.initializer) {
                if (node.initializer.kind === 215 /* VariableDeclarationList */) {
                    ts.forEach(node.initializer.declarations, checkVariableDeclaration);
                }
                else {
                    checkExpression(node.initializer);
                }
            }
            if (node.condition)
                checkExpression(node.condition);
            if (node.incrementor)
                checkExpression(node.incrementor);
            checkSourceElement(node.statement);
        }
        function checkForOfStatement(node) {
            checkGrammarForInOrForOfStatement(node);
            // Check the LHS and RHS
            // If the LHS is a declaration, just check it as a variable declaration, which will in turn check the RHS
            // via checkRightHandSideOfForOf.
            // If the LHS is an expression, check the LHS, as a destructuring assignment or as a reference.
            // Then check that the RHS is assignable to it.
            if (node.initializer.kind === 215 /* VariableDeclarationList */) {
                checkForInOrForOfVariableDeclaration(node);
            }
            else {
                var varExpr = node.initializer;
                var iteratedType = checkRightHandSideOfForOf(node.expression);
                // There may be a destructuring assignment on the left side
                if (varExpr.kind === 167 /* ArrayLiteralExpression */ || varExpr.kind === 168 /* ObjectLiteralExpression */) {
                    // iteratedType may be undefined. In this case, we still want to check the structure of
                    // varExpr, in particular making sure it's a valid LeftHandSideExpression. But we'd like
                    // to short circuit the type relation checking as much as possible, so we pass the unknownType.
                    checkDestructuringAssignment(varExpr, iteratedType || unknownType);
                }
                else {
                    var leftType = checkExpression(varExpr);
                    checkReferenceExpression(varExpr, /*invalidReferenceMessage*/ ts.Diagnostics.Invalid_left_hand_side_in_for_of_statement, 
                    /*constantVariableMessage*/ ts.Diagnostics.The_left_hand_side_of_a_for_of_statement_cannot_be_a_previously_defined_constant);
                    // iteratedType will be undefined if the rightType was missing properties/signatures
                    // required to get its iteratedType (like [Symbol.iterator] or next). This may be
                    // because we accessed properties from anyType, or it may have led to an error inside
                    // getElementTypeOfIterable.
                    if (iteratedType) {
                        checkTypeAssignableTo(iteratedType, leftType, varExpr, /*headMessage*/ undefined);
                    }
                }
            }
            checkSourceElement(node.statement);
        }
        function checkForInStatement(node) {
            // Grammar checking
            checkGrammarForInOrForOfStatement(node);
            // TypeScript 1.0 spec  (April 2014): 5.4
            // In a 'for-in' statement of the form
            // for (let VarDecl in Expr) Statement
            //   VarDecl must be a variable declaration without a type annotation that declares a variable of type Any,
            //   and Expr must be an expression of type Any, an object type, or a type parameter type.
            if (node.initializer.kind === 215 /* VariableDeclarationList */) {
                var variable = node.initializer.declarations[0];
                if (variable && ts.isBindingPattern(variable.name)) {
                    error(variable.name, ts.Diagnostics.The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern);
                }
                checkForInOrForOfVariableDeclaration(node);
            }
            else {
                // In a 'for-in' statement of the form
                // for (Var in Expr) Statement
                //   Var must be an expression classified as a reference of type Any or the String primitive type,
                //   and Expr must be an expression of type Any, an object type, or a type parameter type.
                var varExpr = node.initializer;
                var leftType = checkExpression(varExpr);
                if (varExpr.kind === 167 /* ArrayLiteralExpression */ || varExpr.kind === 168 /* ObjectLiteralExpression */) {
                    error(varExpr, ts.Diagnostics.The_left_hand_side_of_a_for_in_statement_cannot_be_a_destructuring_pattern);
                }
                else if (!isTypeAnyOrAllConstituentTypesHaveKind(leftType, 258 /* StringLike */)) {
                    error(varExpr, ts.Diagnostics.The_left_hand_side_of_a_for_in_statement_must_be_of_type_string_or_any);
                }
                else {
                    // run check only former check succeeded to avoid cascading errors
                    checkReferenceExpression(varExpr, ts.Diagnostics.Invalid_left_hand_side_in_for_in_statement, ts.Diagnostics.The_left_hand_side_of_a_for_in_statement_cannot_be_a_previously_defined_constant);
                }
            }
            var rightType = checkExpression(node.expression);
            // unknownType is returned i.e. if node.expression is identifier whose name cannot be resolved
            // in this case error about missing name is already reported - do not report extra one
            if (!isTypeAnyOrAllConstituentTypesHaveKind(rightType, 80896 /* ObjectType */ | 512 /* TypeParameter */)) {
                error(node.expression, ts.Diagnostics.The_right_hand_side_of_a_for_in_statement_must_be_of_type_any_an_object_type_or_a_type_parameter);
            }
            checkSourceElement(node.statement);
        }
        function checkForInOrForOfVariableDeclaration(iterationStatement) {
            var variableDeclarationList = iterationStatement.initializer;
            // checkGrammarForInOrForOfStatement will check that there is exactly one declaration.
            if (variableDeclarationList.declarations.length >= 1) {
                var decl = variableDeclarationList.declarations[0];
                checkVariableDeclaration(decl);
            }
        }
        function checkRightHandSideOfForOf(rhsExpression) {
            var expressionType = getTypeOfExpression(rhsExpression);
            return checkIteratedTypeOrElementType(expressionType, rhsExpression, /*allowStringInput*/ true);
        }
        function checkIteratedTypeOrElementType(inputType, errorNode, allowStringInput) {
            if (isTypeAny(inputType)) {
                return inputType;
            }
            if (languageVersion >= 2 /* ES6 */) {
                return checkElementTypeOfIterable(inputType, errorNode);
            }
            if (allowStringInput) {
                return checkElementTypeOfArrayOrString(inputType, errorNode);
            }
            if (isArrayLikeType(inputType)) {
                var indexType = getIndexTypeOfType(inputType, 1 /* Number */);
                if (indexType) {
                    return indexType;
                }
            }
            error(errorNode, ts.Diagnostics.Type_0_is_not_an_array_type, typeToString(inputType));
            return unknownType;
        }
        /**
         * When errorNode is undefined, it means we should not report any errors.
         */
        function checkElementTypeOfIterable(iterable, errorNode) {
            var elementType = getElementTypeOfIterable(iterable, errorNode);
            // Now even though we have extracted the iteratedType, we will have to validate that the type
            // passed in is actually an Iterable.
            if (errorNode && elementType) {
                checkTypeAssignableTo(iterable, createIterableType(elementType), errorNode);
            }
            return elementType || anyType;
        }
        /**
         * We want to treat type as an iterable, and get the type it is an iterable of. The iterable
         * must have the following structure (annotated with the names of the variables below):
         *
         * { // iterable
         *     [Symbol.iterator]: { // iteratorFunction
         *         (): Iterator<T>
         *     }
         * }
         *
         * T is the type we are after. At every level that involves analyzing return types
         * of signatures, we union the return types of all the signatures.
         *
         * Another thing to note is that at any step of this process, we could run into a dead end,
         * meaning either the property is missing, or we run into the anyType. If either of these things
         * happens, we return undefined to signal that we could not find the iterated type. If a property
         * is missing, and the previous step did not result in 'any', then we also give an error if the
         * caller requested it. Then the caller can decide what to do in the case where there is no iterated
         * type. This is different from returning anyType, because that would signify that we have matched the
         * whole pattern and that T (above) is 'any'.
         */
        function getElementTypeOfIterable(type, errorNode) {
            if (isTypeAny(type)) {
                return undefined;
            }
            var typeAsIterable = type;
            if (!typeAsIterable.iterableElementType) {
                // As an optimization, if the type is instantiated directly using the globalIterableType (Iterable<number>),
                // then just grab its type argument.
                if ((type.flags & 4096 /* Reference */) && type.target === globalIterableType) {
                    typeAsIterable.iterableElementType = type.typeArguments[0];
                }
                else {
                    var iteratorFunction = getTypeOfPropertyOfType(type, ts.getPropertyNameForKnownSymbolName("iterator"));
                    if (isTypeAny(iteratorFunction)) {
                        return undefined;
                    }
                    var iteratorFunctionSignatures = iteratorFunction ? getSignaturesOfType(iteratorFunction, 0 /* Call */) : emptyArray;
                    if (iteratorFunctionSignatures.length === 0) {
                        if (errorNode) {
                            error(errorNode, ts.Diagnostics.Type_must_have_a_Symbol_iterator_method_that_returns_an_iterator);
                        }
                        return undefined;
                    }
                    typeAsIterable.iterableElementType = getElementTypeOfIterator(getUnionType(ts.map(iteratorFunctionSignatures, getReturnTypeOfSignature)), errorNode);
                }
            }
            return typeAsIterable.iterableElementType;
        }
        /**
         * This function has very similar logic as getElementTypeOfIterable, except that it operates on
         * Iterators instead of Iterables. Here is the structure:
         *
         *  { // iterator
         *      next: { // iteratorNextFunction
         *          (): { // iteratorNextResult
         *              value: T // iteratorNextValue
         *          }
         *      }
         *  }
         *
         */
        function getElementTypeOfIterator(type, errorNode) {
            if (isTypeAny(type)) {
                return undefined;
            }
            var typeAsIterator = type;
            if (!typeAsIterator.iteratorElementType) {
                // As an optimization, if the type is instantiated directly using the globalIteratorType (Iterator<number>),
                // then just grab its type argument.
                if ((type.flags & 4096 /* Reference */) && type.target === globalIteratorType) {
                    typeAsIterator.iteratorElementType = type.typeArguments[0];
                }
                else {
                    var iteratorNextFunction = getTypeOfPropertyOfType(type, "next");
                    if (isTypeAny(iteratorNextFunction)) {
                        return undefined;
                    }
                    var iteratorNextFunctionSignatures = iteratorNextFunction ? getSignaturesOfType(iteratorNextFunction, 0 /* Call */) : emptyArray;
                    if (iteratorNextFunctionSignatures.length === 0) {
                        if (errorNode) {
                            error(errorNode, ts.Diagnostics.An_iterator_must_have_a_next_method);
                        }
                        return undefined;
                    }
                    var iteratorNextResult = getUnionType(ts.map(iteratorNextFunctionSignatures, getReturnTypeOfSignature));
                    if (isTypeAny(iteratorNextResult)) {
                        return undefined;
                    }
                    var iteratorNextValue = getTypeOfPropertyOfType(iteratorNextResult, "value");
                    if (!iteratorNextValue) {
                        if (errorNode) {
                            error(errorNode, ts.Diagnostics.The_type_returned_by_the_next_method_of_an_iterator_must_have_a_value_property);
                        }
                        return undefined;
                    }
                    typeAsIterator.iteratorElementType = iteratorNextValue;
                }
            }
            return typeAsIterator.iteratorElementType;
        }
        function getElementTypeOfIterableIterator(type) {
            if (isTypeAny(type)) {
                return undefined;
            }
            // As an optimization, if the type is instantiated directly using the globalIterableIteratorType (IterableIterator<number>),
            // then just grab its type argument.
            if ((type.flags & 4096 /* Reference */) && type.target === globalIterableIteratorType) {
                return type.typeArguments[0];
            }
            return getElementTypeOfIterable(type, /*errorNode*/ undefined) ||
                getElementTypeOfIterator(type, /*errorNode*/ undefined);
        }
        /**
         * This function does the following steps:
         *   1. Break up arrayOrStringType (possibly a union) into its string constituents and array constituents.
         *   2. Take the element types of the array constituents.
         *   3. Return the union of the element types, and string if there was a string constitutent.
         *
         * For example:
         *     string -> string
         *     number[] -> number
         *     string[] | number[] -> string | number
         *     string | number[] -> string | number
         *     string | string[] | number[] -> string | number
         *
         * It also errors if:
         *   1. Some constituent is neither a string nor an array.
         *   2. Some constituent is a string and target is less than ES5 (because in ES3 string is not indexable).
         */
        function checkElementTypeOfArrayOrString(arrayOrStringType, errorNode) {
            ts.Debug.assert(languageVersion < 2 /* ES6 */);
            // After we remove all types that are StringLike, we will know if there was a string constituent
            // based on whether the remaining type is the same as the initial type.
            var arrayType = arrayOrStringType;
            if (arrayOrStringType.flags & 16384 /* Union */) {
                arrayType = getUnionType(ts.filter(arrayOrStringType.types, function (t) { return !(t.flags & 258 /* StringLike */); }));
            }
            else if (arrayOrStringType.flags & 258 /* StringLike */) {
                arrayType = emptyUnionType;
            }
            var hasStringConstituent = arrayOrStringType !== arrayType;
            var reportedError = false;
            if (hasStringConstituent) {
                if (languageVersion < 1 /* ES5 */) {
                    error(errorNode, ts.Diagnostics.Using_a_string_in_a_for_of_statement_is_only_supported_in_ECMAScript_5_and_higher);
                    reportedError = true;
                }
                // Now that we've removed all the StringLike types, if no constituents remain, then the entire
                // arrayOrStringType was a string.
                if (arrayType === emptyObjectType) {
                    return stringType;
                }
            }
            if (!isArrayLikeType(arrayType)) {
                if (!reportedError) {
                    // Which error we report depends on whether there was a string constituent. For example,
                    // if the input type is number | string, we want to say that number is not an array type.
                    // But if the input was just number, we want to say that number is not an array type
                    // or a string type.
                    var diagnostic = hasStringConstituent
                        ? ts.Diagnostics.Type_0_is_not_an_array_type
                        : ts.Diagnostics.Type_0_is_not_an_array_type_or_a_string_type;
                    error(errorNode, diagnostic, typeToString(arrayType));
                }
                return hasStringConstituent ? stringType : unknownType;
            }
            var arrayElementType = getIndexTypeOfType(arrayType, 1 /* Number */) || unknownType;
            if (hasStringConstituent) {
                // This is just an optimization for the case where arrayOrStringType is string | string[]
                if (arrayElementType.flags & 258 /* StringLike */) {
                    return stringType;
                }
                return getUnionType([arrayElementType, stringType]);
            }
            return arrayElementType;
        }
        function checkBreakOrContinueStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node) || checkGrammarBreakOrContinueStatement(node);
            // TODO: Check that target label is valid
        }
        function isGetAccessorWithAnnotatatedSetAccessor(node) {
            return !!(node.kind === 146 /* GetAccessor */ && ts.getSetAccessorTypeAnnotationNode(ts.getDeclarationOfKind(node.symbol, 147 /* SetAccessor */)));
        }
        function checkReturnStatement(node) {
            // Grammar checking
            if (!checkGrammarStatementInAmbientContext(node)) {
                var functionBlock = ts.getContainingFunction(node);
                if (!functionBlock) {
                    grammarErrorOnFirstToken(node, ts.Diagnostics.A_return_statement_can_only_be_used_within_a_function_body);
                }
            }
            if (node.expression) {
                var func = ts.getContainingFunction(node);
                if (func) {
                    var signature = getSignatureFromDeclaration(func);
                    var returnType = getReturnTypeOfSignature(signature);
                    var exprType = checkExpressionCached(node.expression);
                    if (func.asteriskToken) {
                        // A generator does not need its return expressions checked against its return type.
                        // Instead, the yield expressions are checked against the element type.
                        // TODO: Check return expressions of generators when return type tracking is added
                        // for generators.
                        return;
                    }
                    if (func.kind === 147 /* SetAccessor */) {
                        error(node.expression, ts.Diagnostics.Setters_cannot_return_a_value);
                    }
                    else if (func.kind === 145 /* Constructor */) {
                        if (!checkTypeAssignableTo(exprType, returnType, node.expression)) {
                            error(node.expression, ts.Diagnostics.Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class);
                        }
                    }
                    else if (func.type || isGetAccessorWithAnnotatatedSetAccessor(func)) {
                        if (ts.isAsyncFunctionLike(func)) {
                            var promisedType = getPromisedType(returnType);
                            var awaitedType = checkAwaitedType(exprType, node.expression, ts.Diagnostics.Return_expression_in_async_function_does_not_have_a_valid_callable_then_member);
                            if (promisedType) {
                                // If the function has a return type, but promisedType is
                                // undefined, an error will be reported in checkAsyncFunctionReturnType
                                // so we don't need to report one here.
                                checkTypeAssignableTo(awaitedType, promisedType, node.expression);
                            }
                        }
                        else {
                            checkTypeAssignableTo(exprType, returnType, node.expression);
                        }
                    }
                }
            }
        }
        function checkWithStatement(node) {
            // Grammar checking for withStatement
            if (!checkGrammarStatementInAmbientContext(node)) {
                if (node.parserContextFlags & 8 /* Await */) {
                    grammarErrorOnFirstToken(node, ts.Diagnostics.with_statements_are_not_allowed_in_an_async_function_block);
                }
            }
            checkExpression(node.expression);
            error(node.expression, ts.Diagnostics.All_symbols_within_a_with_block_will_be_resolved_to_any);
        }
        function checkSwitchStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node);
            var firstDefaultClause;
            var hasDuplicateDefaultClause = false;
            var expressionType = checkExpression(node.expression);
            var expressionTypeIsStringLike = someConstituentTypeHasKind(expressionType, 258 /* StringLike */);
            ts.forEach(node.caseBlock.clauses, function (clause) {
                // Grammar check for duplicate default clauses, skip if we already report duplicate default clause
                if (clause.kind === 245 /* DefaultClause */ && !hasDuplicateDefaultClause) {
                    if (firstDefaultClause === undefined) {
                        firstDefaultClause = clause;
                    }
                    else {
                        var sourceFile = ts.getSourceFileOfNode(node);
                        var start = ts.skipTrivia(sourceFile.text, clause.pos);
                        var end = clause.statements.length > 0 ? clause.statements[0].pos : clause.end;
                        grammarErrorAtPos(sourceFile, start, end - start, ts.Diagnostics.A_default_clause_cannot_appear_more_than_once_in_a_switch_statement);
                        hasDuplicateDefaultClause = true;
                    }
                }
                if (produceDiagnostics && clause.kind === 244 /* CaseClause */) {
                    var caseClause = clause;
                    // TypeScript 1.0 spec (April 2014):5.9
                    // In a 'switch' statement, each 'case' expression must be of a type that is assignable to or from the type of the 'switch' expression.
                    var caseType = checkExpression(caseClause.expression);
                    var expressionTypeIsAssignableToCaseType = 
                    // Permit 'number[] | "foo"' to be asserted to 'string'.
                    (expressionTypeIsStringLike && someConstituentTypeHasKind(caseType, 258 /* StringLike */)) ||
                        isTypeAssignableTo(expressionType, caseType);
                    if (!expressionTypeIsAssignableToCaseType) {
                        // 'expressionType is not assignable to caseType', try the reversed check and report errors if it fails
                        checkTypeAssignableTo(caseType, expressionType, caseClause.expression, /*headMessage*/ undefined);
                    }
                }
                ts.forEach(clause.statements, checkSourceElement);
            });
        }
        function checkLabeledStatement(node) {
            // Grammar checking
            if (!checkGrammarStatementInAmbientContext(node)) {
                var current = node.parent;
                while (current) {
                    if (ts.isFunctionLike(current)) {
                        break;
                    }
                    if (current.kind === 210 /* LabeledStatement */ && current.label.text === node.label.text) {
                        var sourceFile = ts.getSourceFileOfNode(node);
                        grammarErrorOnNode(node.label, ts.Diagnostics.Duplicate_label_0, ts.getTextOfNodeFromSourceText(sourceFile.text, node.label));
                        break;
                    }
                    current = current.parent;
                }
            }
            // ensure that label is unique
            checkSourceElement(node.statement);
        }
        function checkThrowStatement(node) {
            // Grammar checking
            if (!checkGrammarStatementInAmbientContext(node)) {
                if (node.expression === undefined) {
                    grammarErrorAfterFirstToken(node, ts.Diagnostics.Line_break_not_permitted_here);
                }
            }
            if (node.expression) {
                checkExpression(node.expression);
            }
        }
        function checkTryStatement(node) {
            // Grammar checking
            checkGrammarStatementInAmbientContext(node);
            checkBlock(node.tryBlock);
            var catchClause = node.catchClause;
            if (catchClause) {
                // Grammar checking
                if (catchClause.variableDeclaration) {
                    if (catchClause.variableDeclaration.name.kind !== 69 /* Identifier */) {
                        grammarErrorOnFirstToken(catchClause.variableDeclaration.name, ts.Diagnostics.Catch_clause_variable_name_must_be_an_identifier);
                    }
                    else if (catchClause.variableDeclaration.type) {
                        grammarErrorOnFirstToken(catchClause.variableDeclaration.type, ts.Diagnostics.Catch_clause_variable_cannot_have_a_type_annotation);
                    }
                    else if (catchClause.variableDeclaration.initializer) {
                        grammarErrorOnFirstToken(catchClause.variableDeclaration.initializer, ts.Diagnostics.Catch_clause_variable_cannot_have_an_initializer);
                    }
                    else {
                        var identifierName = catchClause.variableDeclaration.name.text;
                        var locals = catchClause.block.locals;
                        if (locals && ts.hasProperty(locals, identifierName)) {
                            var localSymbol = locals[identifierName];
                            if (localSymbol && (localSymbol.flags & 2 /* BlockScopedVariable */) !== 0) {
                                grammarErrorOnNode(localSymbol.valueDeclaration, ts.Diagnostics.Cannot_redeclare_identifier_0_in_catch_clause, identifierName);
                            }
                        }
                    }
                }
                checkBlock(catchClause.block);
            }
            if (node.finallyBlock) {
                checkBlock(node.finallyBlock);
            }
        }
        function checkIndexConstraints(type) {
            var declaredNumberIndexer = getIndexDeclarationOfSymbol(type.symbol, 1 /* Number */);
            var declaredStringIndexer = getIndexDeclarationOfSymbol(type.symbol, 0 /* String */);
            var stringIndexType = getIndexTypeOfType(type, 0 /* String */);
            var numberIndexType = getIndexTypeOfType(type, 1 /* Number */);
            if (stringIndexType || numberIndexType) {
                ts.forEach(getPropertiesOfObjectType(type), function (prop) {
                    var propType = getTypeOfSymbol(prop);
                    checkIndexConstraintForProperty(prop, propType, type, declaredStringIndexer, stringIndexType, 0 /* String */);
                    checkIndexConstraintForProperty(prop, propType, type, declaredNumberIndexer, numberIndexType, 1 /* Number */);
                });
                if (type.flags & 1024 /* Class */ && ts.isClassLike(type.symbol.valueDeclaration)) {
                    var classDeclaration = type.symbol.valueDeclaration;
                    for (var _i = 0, _a = classDeclaration.members; _i < _a.length; _i++) {
                        var member = _a[_i];
                        // Only process instance properties with computed names here.
                        // Static properties cannot be in conflict with indexers,
                        // and properties with literal names were already checked.
                        if (!(member.flags & 64 /* Static */) && ts.hasDynamicName(member)) {
                            var propType = getTypeOfSymbol(member.symbol);
                            checkIndexConstraintForProperty(member.symbol, propType, type, declaredStringIndexer, stringIndexType, 0 /* String */);
                            checkIndexConstraintForProperty(member.symbol, propType, type, declaredNumberIndexer, numberIndexType, 1 /* Number */);
                        }
                    }
                }
            }
            var errorNode;
            if (stringIndexType && numberIndexType) {
                errorNode = declaredNumberIndexer || declaredStringIndexer;
                // condition 'errorNode === undefined' may appear if types does not declare nor string neither number indexer
                if (!errorNode && (type.flags & 2048 /* Interface */)) {
                    var someBaseTypeHasBothIndexers = ts.forEach(getBaseTypes(type), function (base) { return getIndexTypeOfType(base, 0 /* String */) && getIndexTypeOfType(base, 1 /* Number */); });
                    errorNode = someBaseTypeHasBothIndexers ? undefined : type.symbol.declarations[0];
                }
            }
            if (errorNode && !isTypeAssignableTo(numberIndexType, stringIndexType)) {
                error(errorNode, ts.Diagnostics.Numeric_index_type_0_is_not_assignable_to_string_index_type_1, typeToString(numberIndexType), typeToString(stringIndexType));
            }
            function checkIndexConstraintForProperty(prop, propertyType, containingType, indexDeclaration, indexType, indexKind) {
                if (!indexType) {
                    return;
                }
                // index is numeric and property name is not valid numeric literal
                if (indexKind === 1 /* Number */ && !isNumericName(prop.valueDeclaration.name)) {
                    return;
                }
                // perform property check if property or indexer is declared in 'type'
                // this allows to rule out cases when both property and indexer are inherited from the base class
                var errorNode;
                if (prop.valueDeclaration.name.kind === 137 /* ComputedPropertyName */ || prop.parent === containingType.symbol) {
                    errorNode = prop.valueDeclaration;
                }
                else if (indexDeclaration) {
                    errorNode = indexDeclaration;
                }
                else if (containingType.flags & 2048 /* Interface */) {
                    // for interfaces property and indexer might be inherited from different bases
                    // check if any base class already has both property and indexer.
                    // check should be performed only if 'type' is the first type that brings property\indexer together
                    var someBaseClassHasBothPropertyAndIndexer = ts.forEach(getBaseTypes(containingType), function (base) { return getPropertyOfObjectType(base, prop.name) && getIndexTypeOfType(base, indexKind); });
                    errorNode = someBaseClassHasBothPropertyAndIndexer ? undefined : containingType.symbol.declarations[0];
                }
                if (errorNode && !isTypeAssignableTo(propertyType, indexType)) {
                    var errorMessage = indexKind === 0 /* String */
                        ? ts.Diagnostics.Property_0_of_type_1_is_not_assignable_to_string_index_type_2
                        : ts.Diagnostics.Property_0_of_type_1_is_not_assignable_to_numeric_index_type_2;
                    error(errorNode, errorMessage, symbolToString(prop), typeToString(propertyType), typeToString(indexType));
                }
            }
        }
        function checkTypeNameIsReserved(name, message) {
            // TS 1.0 spec (April 2014): 3.6.1
            // The predefined type keywords are reserved and cannot be used as names of user defined types.
            switch (name.text) {
                case "any":
                case "number":
                case "boolean":
                case "string":
                case "symbol":
                case "void":
                    error(name, message, name.text);
            }
        }
        // Check each type parameter and check that list has no duplicate type parameter declarations
        function checkTypeParameters(typeParameterDeclarations) {
            if (typeParameterDeclarations) {
                for (var i = 0, n = typeParameterDeclarations.length; i < n; i++) {
                    var node = typeParameterDeclarations[i];
                    checkTypeParameter(node);
                    if (produceDiagnostics) {
                        for (var j = 0; j < i; j++) {
                            if (typeParameterDeclarations[j].symbol === node.symbol) {
                                error(node.name, ts.Diagnostics.Duplicate_identifier_0, ts.declarationNameToString(node.name));
                            }
                        }
                    }
                }
            }
        }
        function checkClassExpression(node) {
            checkClassLikeDeclaration(node);
            checkNodeDeferred(node);
            return getTypeOfSymbol(getSymbolOfNode(node));
        }
        function checkClassExpressionDeferred(node) {
            ts.forEach(node.members, checkSourceElement);
        }
        function checkClassDeclaration(node) {
            if (!node.name && !(node.flags & 512 /* Default */)) {
                grammarErrorOnFirstToken(node, ts.Diagnostics.A_class_declaration_without_the_default_modifier_must_have_a_name);
            }
            checkClassLikeDeclaration(node);
            ts.forEach(node.members, checkSourceElement);
        }
        function checkClassLikeDeclaration(node) {
            checkGrammarClassDeclarationHeritageClauses(node);
            checkDecorators(node);
            if (node.name) {
                checkTypeNameIsReserved(node.name, ts.Diagnostics.Class_name_cannot_be_0);
                checkCollisionWithCapturedThisVariable(node, node.name);
                checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
                checkCollisionWithGlobalPromiseInGeneratedCode(node, node.name);
            }
            checkTypeParameters(node.typeParameters);
            checkExportsOnMergedDeclarations(node);
            var symbol = getSymbolOfNode(node);
            var type = getDeclaredTypeOfSymbol(symbol);
            var typeWithThis = getTypeWithThisArgument(type);
            var staticType = getTypeOfSymbol(symbol);
            var baseTypeNode = ts.getClassExtendsHeritageClauseElement(node);
            if (baseTypeNode) {
                var baseTypes = getBaseTypes(type);
                if (baseTypes.length && produceDiagnostics) {
                    var baseType_1 = baseTypes[0];
                    var staticBaseType = getBaseConstructorTypeOfClass(type);
                    checkSourceElement(baseTypeNode.expression);
                    if (baseTypeNode.typeArguments) {
                        ts.forEach(baseTypeNode.typeArguments, checkSourceElement);
                        for (var _i = 0, _a = getConstructorsForTypeArguments(staticBaseType, baseTypeNode.typeArguments); _i < _a.length; _i++) {
                            var constructor = _a[_i];
                            if (!checkTypeArgumentConstraints(constructor.typeParameters, baseTypeNode.typeArguments)) {
                                break;
                            }
                        }
                    }
                    checkTypeAssignableTo(typeWithThis, getTypeWithThisArgument(baseType_1, type.thisType), node.name || node, ts.Diagnostics.Class_0_incorrectly_extends_base_class_1);
                    checkTypeAssignableTo(staticType, getTypeWithoutSignatures(staticBaseType), node.name || node, ts.Diagnostics.Class_static_side_0_incorrectly_extends_base_class_static_side_1);
                    if (!(staticBaseType.symbol && staticBaseType.symbol.flags & 32 /* Class */)) {
                        // When the static base type is a "class-like" constructor function (but not actually a class), we verify
                        // that all instantiated base constructor signatures return the same type. We can simply compare the type
                        // references (as opposed to checking the structure of the types) because elsewhere we have already checked
                        // that the base type is a class or interface type (and not, for example, an anonymous object type).
                        var constructors = getInstantiatedConstructorsForTypeArguments(staticBaseType, baseTypeNode.typeArguments);
                        if (ts.forEach(constructors, function (sig) { return getReturnTypeOfSignature(sig) !== baseType_1; })) {
                            error(baseTypeNode.expression, ts.Diagnostics.Base_constructors_must_all_have_the_same_return_type);
                        }
                    }
                    checkKindsOfPropertyMemberOverrides(type, baseType_1);
                }
            }
            var implementedTypeNodes = ts.getClassImplementsHeritageClauseElements(node);
            if (implementedTypeNodes) {
                for (var _b = 0, implementedTypeNodes_1 = implementedTypeNodes; _b < implementedTypeNodes_1.length; _b++) {
                    var typeRefNode = implementedTypeNodes_1[_b];
                    if (!ts.isSupportedExpressionWithTypeArguments(typeRefNode)) {
                        error(typeRefNode.expression, ts.Diagnostics.A_class_can_only_implement_an_identifier_Slashqualified_name_with_optional_type_arguments);
                    }
                    checkTypeReferenceNode(typeRefNode);
                    if (produceDiagnostics) {
                        var t = getTypeFromTypeNode(typeRefNode);
                        if (t !== unknownType) {
                            var declaredType = (t.flags & 4096 /* Reference */) ? t.target : t;
                            if (declaredType.flags & (1024 /* Class */ | 2048 /* Interface */)) {
                                checkTypeAssignableTo(typeWithThis, getTypeWithThisArgument(t, type.thisType), node.name || node, ts.Diagnostics.Class_0_incorrectly_implements_interface_1);
                            }
                            else {
                                error(typeRefNode, ts.Diagnostics.A_class_may_only_implement_another_class_or_interface);
                            }
                        }
                    }
                }
            }
            if (produceDiagnostics) {
                checkIndexConstraints(type);
                checkTypeForDuplicateIndexSignatures(node);
            }
        }
        function getTargetSymbol(s) {
            // if symbol is instantiated its flags are not copied from the 'target'
            // so we'll need to get back original 'target' symbol to work with correct set of flags
            return s.flags & 16777216 /* Instantiated */ ? getSymbolLinks(s).target : s;
        }
        function getClassLikeDeclarationOfSymbol(symbol) {
            return ts.forEach(symbol.declarations, function (d) { return ts.isClassLike(d) ? d : undefined; });
        }
        function checkKindsOfPropertyMemberOverrides(type, baseType) {
            // TypeScript 1.0 spec (April 2014): 8.2.3
            // A derived class inherits all members from its base class it doesn't override.
            // Inheritance means that a derived class implicitly contains all non - overridden members of the base class.
            // Both public and private property members are inherited, but only public property members can be overridden.
            // A property member in a derived class is said to override a property member in a base class
            // when the derived class property member has the same name and kind(instance or static)
            // as the base class property member.
            // The type of an overriding property member must be assignable(section 3.8.4)
            // to the type of the overridden property member, or otherwise a compile - time error occurs.
            // Base class instance member functions can be overridden by derived class instance member functions,
            // but not by other kinds of members.
            // Base class instance member variables and accessors can be overridden by
            // derived class instance member variables and accessors, but not by other kinds of members.
            // NOTE: assignability is checked in checkClassDeclaration
            var baseProperties = getPropertiesOfObjectType(baseType);
            for (var _i = 0, baseProperties_1 = baseProperties; _i < baseProperties_1.length; _i++) {
                var baseProperty = baseProperties_1[_i];
                var base = getTargetSymbol(baseProperty);
                if (base.flags & 134217728 /* Prototype */) {
                    continue;
                }
                var derived = getTargetSymbol(getPropertyOfObjectType(type, base.name));
                var baseDeclarationFlags = getDeclarationFlagsFromSymbol(base);
                ts.Debug.assert(!!derived, "derived should point to something, even if it is the base class' declaration.");
                if (derived) {
                    // In order to resolve whether the inherited method was overriden in the base class or not,
                    // we compare the Symbols obtained. Since getTargetSymbol returns the symbol on the *uninstantiated*
                    // type declaration, derived and base resolve to the same symbol even in the case of generic classes.
                    if (derived === base) {
                        // derived class inherits base without override/redeclaration
                        var derivedClassDecl = getClassLikeDeclarationOfSymbol(type.symbol);
                        // It is an error to inherit an abstract member without implementing it or being declared abstract.
                        // If there is no declaration for the derived class (as in the case of class expressions),
                        // then the class cannot be declared abstract.
                        if (baseDeclarationFlags & 128 /* Abstract */ && (!derivedClassDecl || !(derivedClassDecl.flags & 128 /* Abstract */))) {
                            if (derivedClassDecl.kind === 189 /* ClassExpression */) {
                                error(derivedClassDecl, ts.Diagnostics.Non_abstract_class_expression_does_not_implement_inherited_abstract_member_0_from_class_1, symbolToString(baseProperty), typeToString(baseType));
                            }
                            else {
                                error(derivedClassDecl, ts.Diagnostics.Non_abstract_class_0_does_not_implement_inherited_abstract_member_1_from_class_2, typeToString(type), symbolToString(baseProperty), typeToString(baseType));
                            }
                        }
                    }
                    else {
                        // derived overrides base.
                        var derivedDeclarationFlags = getDeclarationFlagsFromSymbol(derived);
                        if ((baseDeclarationFlags & 16 /* Private */) || (derivedDeclarationFlags & 16 /* Private */)) {
                            // either base or derived property is private - not override, skip it
                            continue;
                        }
                        if ((baseDeclarationFlags & 64 /* Static */) !== (derivedDeclarationFlags & 64 /* Static */)) {
                            // value of 'static' is not the same for properties - not override, skip it
                            continue;
                        }
                        if ((base.flags & derived.flags & 8192 /* Method */) || ((base.flags & 98308 /* PropertyOrAccessor */) && (derived.flags & 98308 /* PropertyOrAccessor */))) {
                            // method is overridden with method or property/accessor is overridden with property/accessor - correct case
                            continue;
                        }
                        var errorMessage = void 0;
                        if (base.flags & 8192 /* Method */) {
                            if (derived.flags & 98304 /* Accessor */) {
                                errorMessage = ts.Diagnostics.Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_accessor;
                            }
                            else {
                                ts.Debug.assert((derived.flags & 4 /* Property */) !== 0);
                                errorMessage = ts.Diagnostics.Class_0_defines_instance_member_function_1_but_extended_class_2_defines_it_as_instance_member_property;
                            }
                        }
                        else if (base.flags & 4 /* Property */) {
                            ts.Debug.assert((derived.flags & 8192 /* Method */) !== 0);
                            errorMessage = ts.Diagnostics.Class_0_defines_instance_member_property_1_but_extended_class_2_defines_it_as_instance_member_function;
                        }
                        else {
                            ts.Debug.assert((base.flags & 98304 /* Accessor */) !== 0);
                            ts.Debug.assert((derived.flags & 8192 /* Method */) !== 0);
                            errorMessage = ts.Diagnostics.Class_0_defines_instance_member_accessor_1_but_extended_class_2_defines_it_as_instance_member_function;
                        }
                        error(derived.valueDeclaration.name, errorMessage, typeToString(baseType), symbolToString(base), typeToString(type));
                    }
                }
            }
        }
        function isAccessor(kind) {
            return kind === 146 /* GetAccessor */ || kind === 147 /* SetAccessor */;
        }
        function areTypeParametersIdentical(list1, list2) {
            if (!list1 && !list2) {
                return true;
            }
            if (!list1 || !list2 || list1.length !== list2.length) {
                return false;
            }
            // TypeScript 1.0 spec (April 2014):
            // When a generic interface has multiple declarations,  all declarations must have identical type parameter
            // lists, i.e. identical type parameter names with identical constraints in identical order.
            for (var i = 0, len = list1.length; i < len; i++) {
                var tp1 = list1[i];
                var tp2 = list2[i];
                if (tp1.name.text !== tp2.name.text) {
                    return false;
                }
                if (!tp1.constraint && !tp2.constraint) {
                    continue;
                }
                if (!tp1.constraint || !tp2.constraint) {
                    return false;
                }
                if (!isTypeIdenticalTo(getTypeFromTypeNode(tp1.constraint), getTypeFromTypeNode(tp2.constraint))) {
                    return false;
                }
            }
            return true;
        }
        function checkInheritedPropertiesAreIdentical(type, typeNode) {
            var baseTypes = getBaseTypes(type);
            if (baseTypes.length < 2) {
                return true;
            }
            var seen = {};
            ts.forEach(resolveDeclaredMembers(type).declaredProperties, function (p) { seen[p.name] = { prop: p, containingType: type }; });
            var ok = true;
            for (var _i = 0, baseTypes_2 = baseTypes; _i < baseTypes_2.length; _i++) {
                var base = baseTypes_2[_i];
                var properties = getPropertiesOfObjectType(getTypeWithThisArgument(base, type.thisType));
                for (var _a = 0, properties_4 = properties; _a < properties_4.length; _a++) {
                    var prop = properties_4[_a];
                    if (!ts.hasProperty(seen, prop.name)) {
                        seen[prop.name] = { prop: prop, containingType: base };
                    }
                    else {
                        var existing = seen[prop.name];
                        var isInheritedProperty = existing.containingType !== type;
                        if (isInheritedProperty && !isPropertyIdenticalTo(existing.prop, prop)) {
                            ok = false;
                            var typeName1 = typeToString(existing.containingType);
                            var typeName2 = typeToString(base);
                            var errorInfo = ts.chainDiagnosticMessages(undefined, ts.Diagnostics.Named_property_0_of_types_1_and_2_are_not_identical, symbolToString(prop), typeName1, typeName2);
                            errorInfo = ts.chainDiagnosticMessages(errorInfo, ts.Diagnostics.Interface_0_cannot_simultaneously_extend_types_1_and_2, typeToString(type), typeName1, typeName2);
                            diagnostics.add(ts.createDiagnosticForNodeFromMessageChain(typeNode, errorInfo));
                        }
                    }
                }
            }
            return ok;
        }
        function checkInterfaceDeclaration(node) {
            // Grammar checking
            checkGrammarDecorators(node) || checkGrammarModifiers(node) || checkGrammarInterfaceDeclaration(node);
            checkTypeParameters(node.typeParameters);
            if (produceDiagnostics) {
                checkTypeNameIsReserved(node.name, ts.Diagnostics.Interface_name_cannot_be_0);
                checkExportsOnMergedDeclarations(node);
                var symbol = getSymbolOfNode(node);
                var firstInterfaceDecl = ts.getDeclarationOfKind(symbol, 218 /* InterfaceDeclaration */);
                if (symbol.declarations.length > 1) {
                    if (node !== firstInterfaceDecl && !areTypeParametersIdentical(firstInterfaceDecl.typeParameters, node.typeParameters)) {
                        error(node.name, ts.Diagnostics.All_declarations_of_an_interface_must_have_identical_type_parameters);
                    }
                }
                // Only check this symbol once
                if (node === firstInterfaceDecl) {
                    var type = getDeclaredTypeOfSymbol(symbol);
                    var typeWithThis = getTypeWithThisArgument(type);
                    // run subsequent checks only if first set succeeded
                    if (checkInheritedPropertiesAreIdentical(type, node.name)) {
                        for (var _i = 0, _a = getBaseTypes(type); _i < _a.length; _i++) {
                            var baseType = _a[_i];
                            checkTypeAssignableTo(typeWithThis, getTypeWithThisArgument(baseType, type.thisType), node.name, ts.Diagnostics.Interface_0_incorrectly_extends_interface_1);
                        }
                        checkIndexConstraints(type);
                    }
                }
            }
            ts.forEach(ts.getInterfaceBaseTypeNodes(node), function (heritageElement) {
                if (!ts.isSupportedExpressionWithTypeArguments(heritageElement)) {
                    error(heritageElement.expression, ts.Diagnostics.An_interface_can_only_extend_an_identifier_Slashqualified_name_with_optional_type_arguments);
                }
                checkTypeReferenceNode(heritageElement);
            });
            ts.forEach(node.members, checkSourceElement);
            if (produceDiagnostics) {
                checkTypeForDuplicateIndexSignatures(node);
            }
        }
        function checkTypeAliasDeclaration(node) {
            // Grammar checking
            checkGrammarDecorators(node) || checkGrammarModifiers(node);
            checkTypeNameIsReserved(node.name, ts.Diagnostics.Type_alias_name_cannot_be_0);
            checkSourceElement(node.type);
        }
        function computeEnumMemberValues(node) {
            var nodeLinks = getNodeLinks(node);
            if (!(nodeLinks.flags & 16384 /* EnumValuesComputed */)) {
                var enumSymbol = getSymbolOfNode(node);
                var enumType = getDeclaredTypeOfSymbol(enumSymbol);
                var autoValue = 0; // set to undefined when enum member is non-constant
                var ambient = ts.isInAmbientContext(node);
                var enumIsConst = ts.isConst(node);
                for (var _i = 0, _a = node.members; _i < _a.length; _i++) {
                    var member = _a[_i];
                    if (isComputedNonLiteralName(member.name)) {
                        error(member.name, ts.Diagnostics.Computed_property_names_are_not_allowed_in_enums);
                    }
                    else {
                        var text = getTextOfPropertyName(member.name);
                        if (isNumericLiteralName(text)) {
                            error(member.name, ts.Diagnostics.An_enum_member_cannot_have_a_numeric_name);
                        }
                    }
                    var previousEnumMemberIsNonConstant = autoValue === undefined;
                    var initializer = member.initializer;
                    if (initializer) {
                        autoValue = computeConstantValueForEnumMemberInitializer(initializer, enumType, enumIsConst, ambient);
                    }
                    else if (ambient && !enumIsConst) {
                        // In ambient enum declarations that specify no const modifier, enum member declarations
                        // that omit a value are considered computed members (as opposed to having auto-incremented values assigned).
                        autoValue = undefined;
                    }
                    else if (previousEnumMemberIsNonConstant) {
                        // If the member declaration specifies no value, the member is considered a constant enum member.
                        // If the member is the first member in the enum declaration, it is assigned the value zero.
                        // Otherwise, it is assigned the value of the immediately preceding member plus one,
                        // and an error occurs if the immediately preceding member is not a constant enum member
                        error(member.name, ts.Diagnostics.Enum_member_must_have_initializer);
                    }
                    if (autoValue !== undefined) {
                        getNodeLinks(member).enumMemberValue = autoValue;
                        autoValue++;
                    }
                }
                nodeLinks.flags |= 16384 /* EnumValuesComputed */;
            }
            function computeConstantValueForEnumMemberInitializer(initializer, enumType, enumIsConst, ambient) {
                // Controls if error should be reported after evaluation of constant value is completed
                // Can be false if another more precise error was already reported during evaluation.
                var reportError = true;
                var value = evalConstant(initializer);
                if (reportError) {
                    if (value === undefined) {
                        if (enumIsConst) {
                            error(initializer, ts.Diagnostics.In_const_enum_declarations_member_initializer_must_be_constant_expression);
                        }
                        else if (ambient) {
                            error(initializer, ts.Diagnostics.In_ambient_enum_declarations_member_initializer_must_be_constant_expression);
                        }
                        else {
                            // Only here do we need to check that the initializer is assignable to the enum type.
                            checkTypeAssignableTo(checkExpression(initializer), enumType, initializer, /*headMessage*/ undefined);
                        }
                    }
                    else if (enumIsConst) {
                        if (isNaN(value)) {
                            error(initializer, ts.Diagnostics.const_enum_member_initializer_was_evaluated_to_disallowed_value_NaN);
                        }
                        else if (!isFinite(value)) {
                            error(initializer, ts.Diagnostics.const_enum_member_initializer_was_evaluated_to_a_non_finite_value);
                        }
                    }
                }
                return value;
                function evalConstant(e) {
                    switch (e.kind) {
                        case 182 /* PrefixUnaryExpression */:
                            var value_1 = evalConstant(e.operand);
                            if (value_1 === undefined) {
                                return undefined;
                            }
                            switch (e.operator) {
                                case 35 /* PlusToken */: return value_1;
                                case 36 /* MinusToken */: return -value_1;
                                case 50 /* TildeToken */: return ~value_1;
                            }
                            return undefined;
                        case 184 /* BinaryExpression */:
                            var left = evalConstant(e.left);
                            if (left === undefined) {
                                return undefined;
                            }
                            var right = evalConstant(e.right);
                            if (right === undefined) {
                                return undefined;
                            }
                            switch (e.operatorToken.kind) {
                                case 47 /* BarToken */: return left | right;
                                case 46 /* AmpersandToken */: return left & right;
                                case 44 /* GreaterThanGreaterThanToken */: return left >> right;
                                case 45 /* GreaterThanGreaterThanGreaterThanToken */: return left >>> right;
                                case 43 /* LessThanLessThanToken */: return left << right;
                                case 48 /* CaretToken */: return left ^ right;
                                case 37 /* AsteriskToken */: return left * right;
                                case 39 /* SlashToken */: return left / right;
                                case 35 /* PlusToken */: return left + right;
                                case 36 /* MinusToken */: return left - right;
                                case 40 /* PercentToken */: return left % right;
                            }
                            return undefined;
                        case 8 /* NumericLiteral */:
                            return +e.text;
                        case 175 /* ParenthesizedExpression */:
                            return evalConstant(e.expression);
                        case 69 /* Identifier */:
                        case 170 /* ElementAccessExpression */:
                        case 169 /* PropertyAccessExpression */:
                            var member = initializer.parent;
                            var currentType = getTypeOfSymbol(getSymbolOfNode(member.parent));
                            var enumType_1;
                            var propertyName = void 0;
                            if (e.kind === 69 /* Identifier */) {
                                // unqualified names can refer to member that reside in different declaration of the enum so just doing name resolution won't work.
                                // instead pick current enum type and later try to fetch member from the type
                                enumType_1 = currentType;
                                propertyName = e.text;
                            }
                            else {
                                var expression = void 0;
                                if (e.kind === 170 /* ElementAccessExpression */) {
                                    if (e.argumentExpression === undefined ||
                                        e.argumentExpression.kind !== 9 /* StringLiteral */) {
                                        return undefined;
                                    }
                                    expression = e.expression;
                                    propertyName = e.argumentExpression.text;
                                }
                                else {
                                    expression = e.expression;
                                    propertyName = e.name.text;
                                }
                                // expression part in ElementAccess\PropertyAccess should be either identifier or dottedName
                                var current = expression;
                                while (current) {
                                    if (current.kind === 69 /* Identifier */) {
                                        break;
                                    }
                                    else if (current.kind === 169 /* PropertyAccessExpression */) {
                                        current = current.expression;
                                    }
                                    else {
                                        return undefined;
                                    }
                                }
                                enumType_1 = checkExpression(expression);
                                // allow references to constant members of other enums
                                if (!(enumType_1.symbol && (enumType_1.symbol.flags & 384 /* Enum */))) {
                                    return undefined;
                                }
                            }
                            if (propertyName === undefined) {
                                return undefined;
                            }
                            var property = getPropertyOfObjectType(enumType_1, propertyName);
                            if (!property || !(property.flags & 8 /* EnumMember */)) {
                                return undefined;
                            }
                            var propertyDecl = property.valueDeclaration;
                            // self references are illegal
                            if (member === propertyDecl) {
                                return undefined;
                            }
                            // illegal case: forward reference
                            if (!isBlockScopedNameDeclaredBeforeUse(propertyDecl, member)) {
                                reportError = false;
                                error(e, ts.Diagnostics.A_member_initializer_in_a_enum_declaration_cannot_reference_members_declared_after_it_including_members_defined_in_other_enums);
                                return undefined;
                            }
                            return getNodeLinks(propertyDecl).enumMemberValue;
                    }
                }
            }
        }
        function checkEnumDeclaration(node) {
            if (!produceDiagnostics) {
                return;
            }
            // Grammar checking
            checkGrammarDecorators(node) || checkGrammarModifiers(node);
            checkTypeNameIsReserved(node.name, ts.Diagnostics.Enum_name_cannot_be_0);
            checkCollisionWithCapturedThisVariable(node, node.name);
            checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
            checkCollisionWithGlobalPromiseInGeneratedCode(node, node.name);
            checkExportsOnMergedDeclarations(node);
            computeEnumMemberValues(node);
            var enumIsConst = ts.isConst(node);
            if (compilerOptions.isolatedModules && enumIsConst && ts.isInAmbientContext(node)) {
                error(node.name, ts.Diagnostics.Ambient_const_enums_are_not_allowed_when_the_isolatedModules_flag_is_provided);
            }
            // Spec 2014 - Section 9.3:
            // It isn't possible for one enum declaration to continue the automatic numbering sequence of another,
            // and when an enum type has multiple declarations, only one declaration is permitted to omit a value
            // for the first member.
            //
            // Only perform this check once per symbol
            var enumSymbol = getSymbolOfNode(node);
            var firstDeclaration = ts.getDeclarationOfKind(enumSymbol, node.kind);
            if (node === firstDeclaration) {
                if (enumSymbol.declarations.length > 1) {
                    // check that const is placed\omitted on all enum declarations
                    ts.forEach(enumSymbol.declarations, function (decl) {
                        if (ts.isConstEnumDeclaration(decl) !== enumIsConst) {
                            error(decl.name, ts.Diagnostics.Enum_declarations_must_all_be_const_or_non_const);
                        }
                    });
                }
                var seenEnumMissingInitialInitializer_1 = false;
                ts.forEach(enumSymbol.declarations, function (declaration) {
                    // return true if we hit a violation of the rule, false otherwise
                    if (declaration.kind !== 220 /* EnumDeclaration */) {
                        return false;
                    }
                    var enumDeclaration = declaration;
                    if (!enumDeclaration.members.length) {
                        return false;
                    }
                    var firstEnumMember = enumDeclaration.members[0];
                    if (!firstEnumMember.initializer) {
                        if (seenEnumMissingInitialInitializer_1) {
                            error(firstEnumMember.name, ts.Diagnostics.In_an_enum_with_multiple_declarations_only_one_declaration_can_omit_an_initializer_for_its_first_enum_element);
                        }
                        else {
                            seenEnumMissingInitialInitializer_1 = true;
                        }
                    }
                });
            }
        }
        function getFirstNonAmbientClassOrFunctionDeclaration(symbol) {
            var declarations = symbol.declarations;
            for (var _i = 0, declarations_4 = declarations; _i < declarations_4.length; _i++) {
                var declaration = declarations_4[_i];
                if ((declaration.kind === 217 /* ClassDeclaration */ ||
                    (declaration.kind === 216 /* FunctionDeclaration */ && ts.nodeIsPresent(declaration.body))) &&
                    !ts.isInAmbientContext(declaration)) {
                    return declaration;
                }
            }
            return undefined;
        }
        function inSameLexicalScope(node1, node2) {
            var container1 = ts.getEnclosingBlockScopeContainer(node1);
            var container2 = ts.getEnclosingBlockScopeContainer(node2);
            if (isGlobalSourceFile(container1)) {
                return isGlobalSourceFile(container2);
            }
            else if (isGlobalSourceFile(container2)) {
                return false;
            }
            else {
                return container1 === container2;
            }
        }
        function checkModuleDeclaration(node) {
            if (produceDiagnostics) {
                // Grammar checking
                var isGlobalAugmentation = ts.isGlobalScopeAugmentation(node);
                var inAmbientContext = ts.isInAmbientContext(node);
                if (isGlobalAugmentation && !inAmbientContext) {
                    error(node.name, ts.Diagnostics.Augmentations_for_the_global_scope_should_have_declare_modifier_unless_they_appear_in_already_ambient_context);
                }
                var isAmbientExternalModule = ts.isAmbientModule(node);
                var contextErrorMessage = isAmbientExternalModule
                    ? ts.Diagnostics.An_ambient_module_declaration_is_only_allowed_at_the_top_level_in_a_file
                    : ts.Diagnostics.A_namespace_declaration_is_only_allowed_in_a_namespace_or_module;
                if (checkGrammarModuleElementContext(node, contextErrorMessage)) {
                    // If we hit a module declaration in an illegal context, just bail out to avoid cascading errors.
                    return;
                }
                if (!checkGrammarDecorators(node) && !checkGrammarModifiers(node)) {
                    if (!inAmbientContext && node.name.kind === 9 /* StringLiteral */) {
                        grammarErrorOnNode(node.name, ts.Diagnostics.Only_ambient_modules_can_use_quoted_names);
                    }
                }
                checkCollisionWithCapturedThisVariable(node, node.name);
                checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
                checkCollisionWithGlobalPromiseInGeneratedCode(node, node.name);
                checkExportsOnMergedDeclarations(node);
                var symbol = getSymbolOfNode(node);
                // The following checks only apply on a non-ambient instantiated module declaration.
                if (symbol.flags & 512 /* ValueModule */
                    && symbol.declarations.length > 1
                    && !inAmbientContext
                    && ts.isInstantiatedModule(node, compilerOptions.preserveConstEnums || compilerOptions.isolatedModules)) {
                    var firstNonAmbientClassOrFunc = getFirstNonAmbientClassOrFunctionDeclaration(symbol);
                    if (firstNonAmbientClassOrFunc) {
                        if (ts.getSourceFileOfNode(node) !== ts.getSourceFileOfNode(firstNonAmbientClassOrFunc)) {
                            error(node.name, ts.Diagnostics.A_namespace_declaration_cannot_be_in_a_different_file_from_a_class_or_function_with_which_it_is_merged);
                        }
                        else if (node.pos < firstNonAmbientClassOrFunc.pos) {
                            error(node.name, ts.Diagnostics.A_namespace_declaration_cannot_be_located_prior_to_a_class_or_function_with_which_it_is_merged);
                        }
                    }
                    // if the module merges with a class declaration in the same lexical scope,
                    // we need to track this to ensure the correct emit.
                    var mergedClass = ts.getDeclarationOfKind(symbol, 217 /* ClassDeclaration */);
                    if (mergedClass &&
                        inSameLexicalScope(node, mergedClass)) {
                        getNodeLinks(node).flags |= 32768 /* LexicalModuleMergesWithClass */;
                    }
                }
                if (isAmbientExternalModule) {
                    if (ts.isExternalModuleAugmentation(node)) {
                        // body of the augmentation should be checked for consistency only if augmentation was applied to its target (either global scope or module)
                        // otherwise we'll be swamped in cascading errors.
                        // We can detect if augmentation was applied using following rules:
                        // - augmentation for a global scope is always applied
                        // - augmentation for some external module is applied if symbol for augmentation is merged (it was combined with target module).
                        var checkBody = isGlobalAugmentation || (getSymbolOfNode(node).flags & 33554432 /* Merged */);
                        if (checkBody) {
                            // body of ambient external module is always a module block
                            for (var _i = 0, _a = node.body.statements; _i < _a.length; _i++) {
                                var statement = _a[_i];
                                checkModuleAugmentationElement(statement, isGlobalAugmentation);
                            }
                        }
                    }
                    else if (isGlobalSourceFile(node.parent)) {
                        if (isGlobalAugmentation) {
                            error(node.name, ts.Diagnostics.Augmentations_for_the_global_scope_can_only_be_directly_nested_in_external_modules_or_ambient_module_declarations);
                        }
                        else if (ts.isExternalModuleNameRelative(node.name.text)) {
                            error(node.name, ts.Diagnostics.Ambient_module_declaration_cannot_specify_relative_module_name);
                        }
                    }
                    else {
                        if (isGlobalAugmentation) {
                            error(node.name, ts.Diagnostics.Augmentations_for_the_global_scope_can_only_be_directly_nested_in_external_modules_or_ambient_module_declarations);
                        }
                        else {
                            // Node is not an augmentation and is not located on the script level.
                            // This means that this is declaration of ambient module that is located in other module or namespace which is prohibited.
                            error(node.name, ts.Diagnostics.Ambient_modules_cannot_be_nested_in_other_modules_or_namespaces);
                        }
                    }
                }
            }
            checkSourceElement(node.body);
        }
        function checkModuleAugmentationElement(node, isGlobalAugmentation) {
            switch (node.kind) {
                case 196 /* VariableStatement */:
                    // error each individual name in variable statement instead of marking the entire variable statement
                    for (var _i = 0, _a = node.declarationList.declarations; _i < _a.length; _i++) {
                        var decl = _a[_i];
                        checkModuleAugmentationElement(decl, isGlobalAugmentation);
                    }
                    break;
                case 230 /* ExportAssignment */:
                case 231 /* ExportDeclaration */:
                    grammarErrorOnFirstToken(node, ts.Diagnostics.Exports_and_export_assignments_are_not_permitted_in_module_augmentations);
                    break;
                case 224 /* ImportEqualsDeclaration */:
                    if (node.moduleReference.kind !== 9 /* StringLiteral */) {
                        error(node.name, ts.Diagnostics.Module_augmentation_cannot_introduce_new_names_in_the_top_level_scope);
                        break;
                    }
                // fallthrough
                case 225 /* ImportDeclaration */:
                    grammarErrorOnFirstToken(node, ts.Diagnostics.Imports_are_not_permitted_in_module_augmentations_Consider_moving_them_to_the_enclosing_external_module);
                    break;
                case 166 /* BindingElement */:
                case 214 /* VariableDeclaration */:
                    var name_9 = node.name;
                    if (ts.isBindingPattern(name_9)) {
                        for (var _b = 0, _c = name_9.elements; _b < _c.length; _b++) {
                            var el = _c[_b];
                            // mark individual names in binding pattern
                            checkModuleAugmentationElement(el, isGlobalAugmentation);
                        }
                        break;
                    }
                // fallthrough
                case 217 /* ClassDeclaration */:
                case 220 /* EnumDeclaration */:
                case 216 /* FunctionDeclaration */:
                case 218 /* InterfaceDeclaration */:
                case 221 /* ModuleDeclaration */:
                case 219 /* TypeAliasDeclaration */:
                    var symbol = getSymbolOfNode(node);
                    if (symbol) {
                        // module augmentations cannot introduce new names on the top level scope of the module
                        // this is done it two steps
                        // 1. quick check - if symbol for node is not merged - this is local symbol to this augmentation - report error
                        // 2. main check - report error if value declaration of the parent symbol is module augmentation)
                        var reportError = !(symbol.flags & 33554432 /* Merged */);
                        if (!reportError) {
                            if (isGlobalAugmentation) {
                                // global symbol should not have parent since it is not explicitly exported
                                reportError = symbol.parent !== undefined;
                            }
                            else {
                                // symbol should not originate in augmentation
                                reportError = ts.isExternalModuleAugmentation(symbol.parent.valueDeclaration);
                            }
                        }
                        if (reportError) {
                            error(node, ts.Diagnostics.Module_augmentation_cannot_introduce_new_names_in_the_top_level_scope);
                        }
                    }
                    break;
            }
        }
        function getFirstIdentifier(node) {
            while (true) {
                if (node.kind === 136 /* QualifiedName */) {
                    node = node.left;
                }
                else if (node.kind === 169 /* PropertyAccessExpression */) {
                    node = node.expression;
                }
                else {
                    break;
                }
            }
            ts.Debug.assert(node.kind === 69 /* Identifier */);
            return node;
        }
        function checkExternalImportOrExportDeclaration(node) {
            var moduleName = ts.getExternalModuleName(node);
            if (!ts.nodeIsMissing(moduleName) && moduleName.kind !== 9 /* StringLiteral */) {
                error(moduleName, ts.Diagnostics.String_literal_expected);
                return false;
            }
            var inAmbientExternalModule = node.parent.kind === 222 /* ModuleBlock */ && ts.isAmbientModule(node.parent.parent);
            if (node.parent.kind !== 251 /* SourceFile */ && !inAmbientExternalModule) {
                error(moduleName, node.kind === 231 /* ExportDeclaration */ ?
                    ts.Diagnostics.Export_declarations_are_not_permitted_in_a_namespace :
                    ts.Diagnostics.Import_declarations_in_a_namespace_cannot_reference_a_module);
                return false;
            }
            if (inAmbientExternalModule && ts.isExternalModuleNameRelative(moduleName.text)) {
                // we have already reported errors on top level imports\exports in external module augmentations in checkModuleDeclaration
                // no need to do this again.
                if (!isTopLevelInExternalModuleAugmentation(node)) {
                    // TypeScript 1.0 spec (April 2013): 12.1.6
                    // An ExternalImportDeclaration in an AmbientExternalModuleDeclaration may reference
                    // other external modules only through top - level external module names.
                    // Relative external module names are not permitted.
                    error(node, ts.Diagnostics.Import_or_export_declaration_in_an_ambient_module_declaration_cannot_reference_module_through_relative_module_name);
                    return false;
                }
            }
            return true;
        }
        function checkAliasSymbol(node) {
            var symbol = getSymbolOfNode(node);
            var target = resolveAlias(symbol);
            if (target !== unknownSymbol) {
                var excludedMeanings = (symbol.flags & 107455 /* Value */ ? 107455 /* Value */ : 0) |
                    (symbol.flags & 793056 /* Type */ ? 793056 /* Type */ : 0) |
                    (symbol.flags & 1536 /* Namespace */ ? 1536 /* Namespace */ : 0);
                if (target.flags & excludedMeanings) {
                    var message = node.kind === 233 /* ExportSpecifier */ ?
                        ts.Diagnostics.Export_declaration_conflicts_with_exported_declaration_of_0 :
                        ts.Diagnostics.Import_declaration_conflicts_with_local_declaration_of_0;
                    error(node, message, symbolToString(symbol));
                }
            }
        }
        function checkImportBinding(node) {
            checkCollisionWithCapturedThisVariable(node, node.name);
            checkCollisionWithRequireExportsInGeneratedCode(node, node.name);
            checkCollisionWithGlobalPromiseInGeneratedCode(node, node.name);
            checkAliasSymbol(node);
        }
        function checkImportDeclaration(node) {
            if (checkGrammarModuleElementContext(node, ts.Diagnostics.An_import_declaration_can_only_be_used_in_a_namespace_or_module)) {
                // If we hit an import declaration in an illegal context, just bail out to avoid cascading errors.
                return;
            }
            if (!checkGrammarDecorators(node) && !checkGrammarModifiers(node) && (node.flags & 1022 /* Modifier */)) {
                grammarErrorOnFirstToken(node, ts.Diagnostics.An_import_declaration_cannot_have_modifiers);
            }
            if (checkExternalImportOrExportDeclaration(node)) {
                var importClause = node.importClause;
                if (importClause) {
                    if (importClause.name) {
                        checkImportBinding(importClause);
                    }
                    if (importClause.namedBindings) {
                        if (importClause.namedBindings.kind === 227 /* NamespaceImport */) {
                            checkImportBinding(importClause.namedBindings);
                        }
                        else {
                            ts.forEach(importClause.namedBindings.elements, checkImportBinding);
                        }
                    }
                }
            }
        }
        function checkImportEqualsDeclaration(node) {
            if (checkGrammarModuleElementContext(node, ts.Diagnostics.An_import_declaration_can_only_be_used_in_a_namespace_or_module)) {
                // If we hit an import declaration in an illegal context, just bail out to avoid cascading errors.
                return;
            }
            checkGrammarDecorators(node) || checkGrammarModifiers(node);
            if (ts.isInternalModuleImportEqualsDeclaration(node) || checkExternalImportOrExportDeclaration(node)) {
                checkImportBinding(node);
                if (node.flags & 2 /* Export */) {
                    markExportAsReferenced(node);
                }
                if (ts.isInternalModuleImportEqualsDeclaration(node)) {
                    var target = resolveAlias(getSymbolOfNode(node));
                    if (target !== unknownSymbol) {
                        if (target.flags & 107455 /* Value */) {
                            // Target is a value symbol, check that it is not hidden by a local declaration with the same name
                            var moduleName = getFirstIdentifier(node.moduleReference);
                            if (!(resolveEntityName(moduleName, 107455 /* Value */ | 1536 /* Namespace */).flags & 1536 /* Namespace */)) {
                                error(moduleName, ts.Diagnostics.Module_0_is_hidden_by_a_local_declaration_with_the_same_name, ts.declarationNameToString(moduleName));
                            }
                        }
                        if (target.flags & 793056 /* Type */) {
                            checkTypeNameIsReserved(node.name, ts.Diagnostics.Import_name_cannot_be_0);
                        }
                    }
                }
                else {
                    if (modulekind === 5 /* ES6 */ && !ts.isInAmbientContext(node)) {
                        // Import equals declaration is deprecated in es6 or above
                        grammarErrorOnNode(node, ts.Diagnostics.Import_assignment_cannot_be_used_when_targeting_ECMAScript_6_modules_Consider_using_import_Asterisk_as_ns_from_mod_import_a_from_mod_import_d_from_mod_or_another_module_format_instead);
                    }
                }
            }
        }
        function checkExportDeclaration(node) {
            if (checkGrammarModuleElementContext(node, ts.Diagnostics.An_export_declaration_can_only_be_used_in_a_module)) {
                // If we hit an export in an illegal context, just bail out to avoid cascading errors.
                return;
            }
            if (!checkGrammarDecorators(node) && !checkGrammarModifiers(node) && (node.flags & 1022 /* Modifier */)) {
                grammarErrorOnFirstToken(node, ts.Diagnostics.An_export_declaration_cannot_have_modifiers);
            }
            if (!node.moduleSpecifier || checkExternalImportOrExportDeclaration(node)) {
                if (node.exportClause) {
                    // export { x, y }
                    // export { x, y } from "foo"
                    ts.forEach(node.exportClause.elements, checkExportSpecifier);
                    var inAmbientExternalModule = node.parent.kind === 222 /* ModuleBlock */ && ts.isAmbientModule(node.parent.parent);
                    if (node.parent.kind !== 251 /* SourceFile */ && !inAmbientExternalModule) {
                        error(node, ts.Diagnostics.Export_declarations_are_not_permitted_in_a_namespace);
                    }
                }
                else {
                    // export * from "foo"
                    var moduleSymbol = resolveExternalModuleName(node, node.moduleSpecifier);
                    if (moduleSymbol && hasExportAssignmentSymbol(moduleSymbol)) {
                        error(node.moduleSpecifier, ts.Diagnostics.Module_0_uses_export_and_cannot_be_used_with_export_Asterisk, symbolToString(moduleSymbol));
                    }
                }
            }
        }
        function checkGrammarModuleElementContext(node, errorMessage) {
            if (node.parent.kind !== 251 /* SourceFile */ && node.parent.kind !== 222 /* ModuleBlock */ && node.parent.kind !== 221 /* ModuleDeclaration */) {
                return grammarErrorOnFirstToken(node, errorMessage);
            }
        }
        function checkExportSpecifier(node) {
            checkAliasSymbol(node);
            if (!node.parent.parent.moduleSpecifier) {
                var exportedName = node.propertyName || node.name;
                // find immediate value referenced by exported name (SymbolFlags.Alias is set so we don't chase down aliases)
                var symbol = resolveName(exportedName, exportedName.text, 107455 /* Value */ | 793056 /* Type */ | 1536 /* Namespace */ | 8388608 /* Alias */, 
                /*nameNotFoundMessage*/ undefined, /*nameArg*/ undefined);
                if (symbol && (symbol === undefinedSymbol || isGlobalSourceFile(getDeclarationContainer(symbol.declarations[0])))) {
                    error(exportedName, ts.Diagnostics.Cannot_re_export_name_that_is_not_defined_in_the_module);
                }
                else {
                    markExportAsReferenced(node);
                }
            }
        }
        function checkExportAssignment(node) {
            if (checkGrammarModuleElementContext(node, ts.Diagnostics.An_export_assignment_can_only_be_used_in_a_module)) {
                // If we hit an export assignment in an illegal context, just bail out to avoid cascading errors.
                return;
            }
            var container = node.parent.kind === 251 /* SourceFile */ ? node.parent : node.parent.parent;
            if (container.kind === 221 /* ModuleDeclaration */ && !ts.isAmbientModule(container)) {
                error(node, ts.Diagnostics.An_export_assignment_cannot_be_used_in_a_namespace);
                return;
            }
            // Grammar checking
            if (!checkGrammarDecorators(node) && !checkGrammarModifiers(node) && (node.flags & 1022 /* Modifier */)) {
                grammarErrorOnFirstToken(node, ts.Diagnostics.An_export_assignment_cannot_have_modifiers);
            }
            if (node.expression.kind === 69 /* Identifier */) {
                markExportAsReferenced(node);
            }
            else {
                checkExpressionCached(node.expression);
            }
            checkExternalModuleExports(container);
            if (node.isExportEquals && !ts.isInAmbientContext(node)) {
                if (modulekind === 5 /* ES6 */) {
                    // export assignment is not supported in es6 modules
                    grammarErrorOnNode(node, ts.Diagnostics.Export_assignment_cannot_be_used_when_targeting_ECMAScript_6_modules_Consider_using_export_default_or_another_module_format_instead);
                }
                else if (modulekind === 4 /* System */) {
                    // system modules does not support export assignment
                    grammarErrorOnNode(node, ts.Diagnostics.Export_assignment_is_not_supported_when_module_flag_is_system);
                }
            }
        }
        function hasExportedMembers(moduleSymbol) {
            for (var id in moduleSymbol.exports) {
                if (id !== "export=") {
                    return true;
                }
            }
            return false;
        }
        function checkExternalModuleExports(node) {
            var moduleSymbol = getSymbolOfNode(node);
            var links = getSymbolLinks(moduleSymbol);
            if (!links.exportsChecked) {
                var exportEqualsSymbol = moduleSymbol.exports["export="];
                if (exportEqualsSymbol && hasExportedMembers(moduleSymbol)) {
                    var declaration = getDeclarationOfAliasSymbol(exportEqualsSymbol) || exportEqualsSymbol.valueDeclaration;
                    if (!isTopLevelInExternalModuleAugmentation(declaration)) {
                        error(declaration, ts.Diagnostics.An_export_assignment_cannot_be_used_in_a_module_with_other_exported_elements);
                    }
                }
                // Checks for export * conflicts
                var exports = getExportsOfModule(moduleSymbol);
                for (var id in exports) {
                    if (id === "__export") {
                        continue;
                    }
                    var _a = exports[id], declarations = _a.declarations, flags = _a.flags;
                    // ECMA262: 15.2.1.1 It is a Syntax Error if the ExportedNames of ModuleItemList contains any duplicate entries. (TS Exceptions: namespaces, function overloads, enums, and interfaces)
                    if (!(flags & (1536 /* Namespace */ | 64 /* Interface */ | 384 /* Enum */)) && (flags & 524288 /* TypeAlias */ ? declarations.length - 1 : declarations.length) > 1) {
                        var exportedDeclarations = ts.filter(declarations, isNotOverload);
                        if (exportedDeclarations.length > 1) {
                            for (var _i = 0, exportedDeclarations_1 = exportedDeclarations; _i < exportedDeclarations_1.length; _i++) {
                                var declaration = exportedDeclarations_1[_i];
                                diagnostics.add(ts.createDiagnosticForNode(declaration, ts.Diagnostics.Cannot_redeclare_exported_variable_0, id));
                            }
                        }
                    }
                }
                links.exportsChecked = true;
            }
            function isNotOverload(declaration) {
                return declaration.kind !== 216 /* FunctionDeclaration */ || !!declaration.body;
            }
        }
        function checkSourceElement(node) {
            if (!node) {
                return;
            }
            var kind = node.kind;
            if (cancellationToken) {
                // Only bother checking on a few construct kinds.  We don't want to be excessivly
                // hitting the cancellation token on every node we check.
                switch (kind) {
                    case 221 /* ModuleDeclaration */:
                    case 217 /* ClassDeclaration */:
                    case 218 /* InterfaceDeclaration */:
                    case 216 /* FunctionDeclaration */:
                        cancellationToken.throwIfCancellationRequested();
                }
            }
            switch (kind) {
                case 138 /* TypeParameter */:
                    return checkTypeParameter(node);
                case 139 /* Parameter */:
                    return checkParameter(node);
                case 142 /* PropertyDeclaration */:
                case 141 /* PropertySignature */:
                    return checkPropertyDeclaration(node);
                case 153 /* FunctionType */:
                case 154 /* ConstructorType */:
                case 148 /* CallSignature */:
                case 149 /* ConstructSignature */:
                    return checkSignatureDeclaration(node);
                case 150 /* IndexSignature */:
                    return checkSignatureDeclaration(node);
                case 144 /* MethodDeclaration */:
                case 143 /* MethodSignature */:
                    return checkMethodDeclaration(node);
                case 145 /* Constructor */:
                    return checkConstructorDeclaration(node);
                case 146 /* GetAccessor */:
                case 147 /* SetAccessor */:
                    return checkAccessorDeclaration(node);
                case 152 /* TypeReference */:
                    return checkTypeReferenceNode(node);
                case 151 /* TypePredicate */:
                    return checkTypePredicate(node);
                case 155 /* TypeQuery */:
                    return checkTypeQuery(node);
                case 156 /* TypeLiteral */:
                    return checkTypeLiteral(node);
                case 157 /* ArrayType */:
                    return checkArrayType(node);
                case 158 /* TupleType */:
                    return checkTupleType(node);
                case 159 /* UnionType */:
                case 160 /* IntersectionType */:
                    return checkUnionOrIntersectionType(node);
                case 161 /* ParenthesizedType */:
                    return checkSourceElement(node.type);
                case 216 /* FunctionDeclaration */:
                    return checkFunctionDeclaration(node);
                case 195 /* Block */:
                case 222 /* ModuleBlock */:
                    return checkBlock(node);
                case 196 /* VariableStatement */:
                    return checkVariableStatement(node);
                case 198 /* ExpressionStatement */:
                    return checkExpressionStatement(node);
                case 199 /* IfStatement */:
                    return checkIfStatement(node);
                case 200 /* DoStatement */:
                    return checkDoStatement(node);
                case 201 /* WhileStatement */:
                    return checkWhileStatement(node);
                case 202 /* ForStatement */:
                    return checkForStatement(node);
                case 203 /* ForInStatement */:
                    return checkForInStatement(node);
                case 204 /* ForOfStatement */:
                    return checkForOfStatement(node);
                case 205 /* ContinueStatement */:
                case 206 /* BreakStatement */:
                    return checkBreakOrContinueStatement(node);
                case 207 /* ReturnStatement */:
                    return checkReturnStatement(node);
                case 208 /* WithStatement */:
                    return checkWithStatement(node);
                case 209 /* SwitchStatement */:
                    return checkSwitchStatement(node);
                case 210 /* LabeledStatement */:
                    return checkLabeledStatement(node);
                case 211 /* ThrowStatement */:
                    return checkThrowStatement(node);
                case 212 /* TryStatement */:
                    return checkTryStatement(node);
                case 214 /* VariableDeclaration */:
                    return checkVariableDeclaration(node);
                case 166 /* BindingElement */:
                    return checkBindingElement(node);
                case 217 /* ClassDeclaration */:
                    return checkClassDeclaration(node);
                case 218 /* InterfaceDeclaration */:
                    return checkInterfaceDeclaration(node);
                case 219 /* TypeAliasDeclaration */:
                    return checkTypeAliasDeclaration(node);
                case 220 /* EnumDeclaration */:
                    return checkEnumDeclaration(node);
                case 221 /* ModuleDeclaration */:
                    return checkModuleDeclaration(node);
                case 225 /* ImportDeclaration */:
                    return checkImportDeclaration(node);
                case 224 /* ImportEqualsDeclaration */:
                    return checkImportEqualsDeclaration(node);
                case 231 /* ExportDeclaration */:
                    return checkExportDeclaration(node);
                case 230 /* ExportAssignment */:
                    return checkExportAssignment(node);
                case 197 /* EmptyStatement */:
                    checkGrammarStatementInAmbientContext(node);
                    return;
                case 213 /* DebuggerStatement */:
                    checkGrammarStatementInAmbientContext(node);
                    return;
                case 234 /* MissingDeclaration */:
                    return checkMissingDeclaration(node);
            }
        }
        // Function and class expression bodies are checked after all statements in the enclosing body. This is
        // to ensure constructs like the following are permitted:
        //     const foo = function () {
        //        const s = foo();
        //        return "hello";
        //     }
        // Here, performing a full type check of the body of the function expression whilst in the process of
        // determining the type of foo would cause foo to be given type any because of the recursive reference.
        // Delaying the type check of the body ensures foo has been assigned a type.
        function checkNodeDeferred(node) {
            if (deferredNodes) {
                deferredNodes.push(node);
            }
        }
        function checkDeferredNodes() {
            for (var _i = 0, deferredNodes_1 = deferredNodes; _i < deferredNodes_1.length; _i++) {
                var node = deferredNodes_1[_i];
                switch (node.kind) {
                    case 176 /* FunctionExpression */:
                    case 177 /* ArrowFunction */:
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                        checkFunctionExpressionOrObjectLiteralMethodDeferred(node);
                        break;
                    case 146 /* GetAccessor */:
                    case 147 /* SetAccessor */:
                        checkAccessorDeferred(node);
                        break;
                    case 189 /* ClassExpression */:
                        checkClassExpressionDeferred(node);
                        break;
                }
            }
        }
        function checkSourceFile(node) {
            var start = new Date().getTime();
            checkSourceFileWorker(node);
            ts.checkTime += new Date().getTime() - start;
        }
        // Fully type check a source file and collect the relevant diagnostics.
        function checkSourceFileWorker(node) {
            var links = getNodeLinks(node);
            if (!(links.flags & 1 /* TypeChecked */)) {
                // Check whether the file has declared it is the default lib,
                // and whether the user has specifically chosen to avoid checking it.
                if (compilerOptions.skipDefaultLibCheck) {
                    // If the user specified '--noLib' and a file has a '/// <reference no-default-lib="true"/>',
                    // then we should treat that file as a default lib.
                    if (node.hasNoDefaultLib) {
                        return;
                    }
                }
                // Grammar checking
                checkGrammarSourceFile(node);
                potentialThisCollisions.length = 0;
                deferredNodes = [];
                ts.forEach(node.statements, checkSourceElement);
                checkDeferredNodes();
                deferredNodes = undefined;
                if (ts.isExternalOrCommonJsModule(node)) {
                    checkExternalModuleExports(node);
                }
                if (potentialThisCollisions.length) {
                    ts.forEach(potentialThisCollisions, checkIfThisIsCapturedInEnclosingScope);
                    potentialThisCollisions.length = 0;
                }
                links.flags |= 1 /* TypeChecked */;
            }
        }
        function getDiagnostics(sourceFile, ct) {
            try {
                // Record the cancellation token so it can be checked later on during checkSourceElement.
                // Do this in a finally block so we can ensure that it gets reset back to nothing after
                // this call is done.
                cancellationToken = ct;
                return getDiagnosticsWorker(sourceFile);
            }
            finally {
                cancellationToken = undefined;
            }
        }
        function getDiagnosticsWorker(sourceFile) {
            throwIfNonDiagnosticsProducing();
            if (sourceFile) {
                checkSourceFile(sourceFile);
                return diagnostics.getDiagnostics(sourceFile.fileName);
            }
            ts.forEach(host.getSourceFiles(), checkSourceFile);
            return diagnostics.getDiagnostics();
        }
        function getGlobalDiagnostics() {
            throwIfNonDiagnosticsProducing();
            return diagnostics.getGlobalDiagnostics();
        }
        function throwIfNonDiagnosticsProducing() {
            if (!produceDiagnostics) {
                throw new Error("Trying to get diagnostics from a type checker that does not produce them.");
            }
        }
        // Language service support
        function isInsideWithStatementBody(node) {
            if (node) {
                while (node.parent) {
                    if (node.parent.kind === 208 /* WithStatement */ && node.parent.statement === node) {
                        return true;
                    }
                    node = node.parent;
                }
            }
            return false;
        }
        function getSymbolsInScope(location, meaning) {
            var symbols = {};
            var memberFlags = 0;
            if (isInsideWithStatementBody(location)) {
                // We cannot answer semantic questions within a with block, do not proceed any further
                return [];
            }
            populateSymbols();
            return symbolsToArray(symbols);
            function populateSymbols() {
                while (location) {
                    if (location.locals && !isGlobalSourceFile(location)) {
                        copySymbols(location.locals, meaning);
                    }
                    switch (location.kind) {
                        case 251 /* SourceFile */:
                            if (!ts.isExternalOrCommonJsModule(location)) {
                                break;
                            }
                        case 221 /* ModuleDeclaration */:
                            copySymbols(getSymbolOfNode(location).exports, meaning & 8914931 /* ModuleMember */);
                            break;
                        case 220 /* EnumDeclaration */:
                            copySymbols(getSymbolOfNode(location).exports, meaning & 8 /* EnumMember */);
                            break;
                        case 189 /* ClassExpression */:
                            var className = location.name;
                            if (className) {
                                copySymbol(location.symbol, meaning);
                            }
                        // fall through; this fall-through is necessary because we would like to handle
                        // type parameter inside class expression similar to how we handle it in classDeclaration and interface Declaration
                        case 217 /* ClassDeclaration */:
                        case 218 /* InterfaceDeclaration */:
                            // If we didn't come from static member of class or interface,
                            // add the type parameters into the symbol table
                            // (type parameters of classDeclaration/classExpression and interface are in member property of the symbol.
                            // Note: that the memberFlags come from previous iteration.
                            if (!(memberFlags & 64 /* Static */)) {
                                copySymbols(getSymbolOfNode(location).members, meaning & 793056 /* Type */);
                            }
                            break;
                        case 176 /* FunctionExpression */:
                            var funcName = location.name;
                            if (funcName) {
                                copySymbol(location.symbol, meaning);
                            }
                            break;
                    }
                    if (ts.introducesArgumentsExoticObject(location)) {
                        copySymbol(argumentsSymbol, meaning);
                    }
                    memberFlags = location.flags;
                    location = location.parent;
                }
                copySymbols(globals, meaning);
            }
            /**
             * Copy the given symbol into symbol tables if the symbol has the given meaning
             * and it doesn't already existed in the symbol table
             * @param key a key for storing in symbol table; if undefined, use symbol.name
             * @param symbol the symbol to be added into symbol table
             * @param meaning meaning of symbol to filter by before adding to symbol table
             */
            function copySymbol(symbol, meaning) {
                if (symbol.flags & meaning) {
                    var id = symbol.name;
                    // We will copy all symbol regardless of its reserved name because
                    // symbolsToArray will check whether the key is a reserved name and
                    // it will not copy symbol with reserved name to the array
                    if (!ts.hasProperty(symbols, id)) {
                        symbols[id] = symbol;
                    }
                }
            }
            function copySymbols(source, meaning) {
                if (meaning) {
                    for (var id in source) {
                        var symbol = source[id];
                        copySymbol(symbol, meaning);
                    }
                }
            }
        }
        function isTypeDeclarationName(name) {
            return name.kind === 69 /* Identifier */ &&
                isTypeDeclaration(name.parent) &&
                name.parent.name === name;
        }
        function isTypeDeclaration(node) {
            switch (node.kind) {
                case 138 /* TypeParameter */:
                case 217 /* ClassDeclaration */:
                case 218 /* InterfaceDeclaration */:
                case 219 /* TypeAliasDeclaration */:
                case 220 /* EnumDeclaration */:
                    return true;
            }
        }
        // True if the given identifier is part of a type reference
        function isTypeReferenceIdentifier(entityName) {
            var node = entityName;
            while (node.parent && node.parent.kind === 136 /* QualifiedName */) {
                node = node.parent;
            }
            return node.parent && node.parent.kind === 152 /* TypeReference */;
        }
        function isHeritageClauseElementIdentifier(entityName) {
            var node = entityName;
            while (node.parent && node.parent.kind === 169 /* PropertyAccessExpression */) {
                node = node.parent;
            }
            return node.parent && node.parent.kind === 191 /* ExpressionWithTypeArguments */;
        }
        function getLeftSideOfImportEqualsOrExportAssignment(nodeOnRightSide) {
            while (nodeOnRightSide.parent.kind === 136 /* QualifiedName */) {
                nodeOnRightSide = nodeOnRightSide.parent;
            }
            if (nodeOnRightSide.parent.kind === 224 /* ImportEqualsDeclaration */) {
                return nodeOnRightSide.parent.moduleReference === nodeOnRightSide && nodeOnRightSide.parent;
            }
            if (nodeOnRightSide.parent.kind === 230 /* ExportAssignment */) {
                return nodeOnRightSide.parent.expression === nodeOnRightSide && nodeOnRightSide.parent;
            }
            return undefined;
        }
        function isInRightSideOfImportOrExportAssignment(node) {
            return getLeftSideOfImportEqualsOrExportAssignment(node) !== undefined;
        }
        function getSymbolOfEntityNameOrPropertyAccessExpression(entityName) {
            if (ts.isDeclarationName(entityName)) {
                return getSymbolOfNode(entityName.parent);
            }
            if (ts.isInJavaScriptFile(entityName) && entityName.parent.kind === 169 /* PropertyAccessExpression */) {
                var specialPropertyAssignmentKind = ts.getSpecialPropertyAssignmentKind(entityName.parent.parent);
                switch (specialPropertyAssignmentKind) {
                    case 1 /* ExportsProperty */:
                    case 3 /* PrototypeProperty */:
                        return getSymbolOfNode(entityName.parent);
                    case 4 /* ThisProperty */:
                    case 2 /* ModuleExports */:
                        return getSymbolOfNode(entityName.parent.parent);
                    default:
                }
            }
            if (entityName.parent.kind === 230 /* ExportAssignment */) {
                return resolveEntityName(entityName, 
                /*all meanings*/ 107455 /* Value */ | 793056 /* Type */ | 1536 /* Namespace */ | 8388608 /* Alias */);
            }
            if (entityName.kind !== 169 /* PropertyAccessExpression */) {
                if (isInRightSideOfImportOrExportAssignment(entityName)) {
                    // Since we already checked for ExportAssignment, this really could only be an Import
                    return getSymbolOfPartOfRightHandSideOfImportEquals(entityName);
                }
            }
            if (ts.isRightSideOfQualifiedNameOrPropertyAccess(entityName)) {
                entityName = entityName.parent;
            }
            if (isHeritageClauseElementIdentifier(entityName)) {
                var meaning = 0 /* None */;
                // In an interface or class, we're definitely interested in a type.
                if (entityName.parent.kind === 191 /* ExpressionWithTypeArguments */) {
                    meaning = 793056 /* Type */;
                    // In a class 'extends' clause we are also looking for a value.
                    if (ts.isExpressionWithTypeArgumentsInClassExtendsClause(entityName.parent)) {
                        meaning |= 107455 /* Value */;
                    }
                }
                else {
                    meaning = 1536 /* Namespace */;
                }
                meaning |= 8388608 /* Alias */;
                return resolveEntityName(entityName, meaning);
            }
            else if ((entityName.parent.kind === 238 /* JsxOpeningElement */) ||
                (entityName.parent.kind === 237 /* JsxSelfClosingElement */) ||
                (entityName.parent.kind === 240 /* JsxClosingElement */)) {
                return getJsxElementTagSymbol(entityName.parent);
            }
            else if (ts.isExpression(entityName)) {
                if (ts.nodeIsMissing(entityName)) {
                    // Missing entity name.
                    return undefined;
                }
                if (entityName.kind === 69 /* Identifier */) {
                    // Include aliases in the meaning, this ensures that we do not follow aliases to where they point and instead
                    // return the alias symbol.
                    var meaning = 107455 /* Value */ | 8388608 /* Alias */;
                    return resolveEntityName(entityName, meaning);
                }
                else if (entityName.kind === 169 /* PropertyAccessExpression */) {
                    var symbol = getNodeLinks(entityName).resolvedSymbol;
                    if (!symbol) {
                        checkPropertyAccessExpression(entityName);
                    }
                    return getNodeLinks(entityName).resolvedSymbol;
                }
                else if (entityName.kind === 136 /* QualifiedName */) {
                    var symbol = getNodeLinks(entityName).resolvedSymbol;
                    if (!symbol) {
                        checkQualifiedName(entityName);
                    }
                    return getNodeLinks(entityName).resolvedSymbol;
                }
            }
            else if (isTypeReferenceIdentifier(entityName)) {
                var meaning = entityName.parent.kind === 152 /* TypeReference */ ? 793056 /* Type */ : 1536 /* Namespace */;
                // Include aliases in the meaning, this ensures that we do not follow aliases to where they point and instead
                // return the alias symbol.
                meaning |= 8388608 /* Alias */;
                return resolveEntityName(entityName, meaning);
            }
            else if (entityName.parent.kind === 241 /* JsxAttribute */) {
                return getJsxAttributePropertySymbol(entityName.parent);
            }
            if (entityName.parent.kind === 151 /* TypePredicate */) {
                return resolveEntityName(entityName, /*meaning*/ 1 /* FunctionScopedVariable */);
            }
            // Do we want to return undefined here?
            return undefined;
        }
        function getSymbolAtLocation(node) {
            if (isInsideWithStatementBody(node)) {
                // We cannot answer semantic questions within a with block, do not proceed any further
                return undefined;
            }
            if (ts.isDeclarationName(node)) {
                // This is a declaration, call getSymbolOfNode
                return getSymbolOfNode(node.parent);
            }
            if (node.kind === 69 /* Identifier */) {
                if (isInRightSideOfImportOrExportAssignment(node)) {
                    return node.parent.kind === 230 /* ExportAssignment */
                        ? getSymbolOfEntityNameOrPropertyAccessExpression(node)
                        : getSymbolOfPartOfRightHandSideOfImportEquals(node);
                }
                else if (node.parent.kind === 166 /* BindingElement */ &&
                    node.parent.parent.kind === 164 /* ObjectBindingPattern */ &&
                    node === node.parent.propertyName) {
                    var typeOfPattern = getTypeOfNode(node.parent.parent);
                    var propertyDeclaration = typeOfPattern && getPropertyOfType(typeOfPattern, node.text);
                    if (propertyDeclaration) {
                        return propertyDeclaration;
                    }
                }
            }
            switch (node.kind) {
                case 69 /* Identifier */:
                case 169 /* PropertyAccessExpression */:
                case 136 /* QualifiedName */:
                    return getSymbolOfEntityNameOrPropertyAccessExpression(node);
                case 97 /* ThisKeyword */:
                case 95 /* SuperKeyword */:
                    var type = ts.isExpression(node) ? checkExpression(node) : getTypeFromTypeNode(node);
                    return type.symbol;
                case 162 /* ThisType */:
                    return getTypeFromTypeNode(node).symbol;
                case 121 /* ConstructorKeyword */:
                    // constructor keyword for an overload, should take us to the definition if it exist
                    var constructorDeclaration = node.parent;
                    if (constructorDeclaration && constructorDeclaration.kind === 145 /* Constructor */) {
                        return constructorDeclaration.parent.symbol;
                    }
                    return undefined;
                case 9 /* StringLiteral */:
                    // External module name in an import declaration
                    if ((ts.isExternalModuleImportEqualsDeclaration(node.parent.parent) &&
                        ts.getExternalModuleImportEqualsDeclarationExpression(node.parent.parent) === node) ||
                        ((node.parent.kind === 225 /* ImportDeclaration */ || node.parent.kind === 231 /* ExportDeclaration */) &&
                            node.parent.moduleSpecifier === node)) {
                        return resolveExternalModuleName(node, node);
                    }
                // Fall through
                case 8 /* NumericLiteral */:
                    // index access
                    if (node.parent.kind === 170 /* ElementAccessExpression */ && node.parent.argumentExpression === node) {
                        var objectType = checkExpression(node.parent.expression);
                        if (objectType === unknownType)
                            return undefined;
                        var apparentType = getApparentType(objectType);
                        if (apparentType === unknownType)
                            return undefined;
                        return getPropertyOfType(apparentType, node.text);
                    }
                    break;
            }
            return undefined;
        }
        function getShorthandAssignmentValueSymbol(location) {
            // The function returns a value symbol of an identifier in the short-hand property assignment.
            // This is necessary as an identifier in short-hand property assignment can contains two meaning:
            // property name and property value.
            if (location && location.kind === 249 /* ShorthandPropertyAssignment */) {
                return resolveEntityName(location.name, 107455 /* Value */ | 8388608 /* Alias */);
            }
            return undefined;
        }
        /** Returns the target of an export specifier without following aliases */
        function getExportSpecifierLocalTargetSymbol(node) {
            return node.parent.parent.moduleSpecifier ?
                getExternalModuleMember(node.parent.parent, node) :
                resolveEntityName(node.propertyName || node.name, 107455 /* Value */ | 793056 /* Type */ | 1536 /* Namespace */ | 8388608 /* Alias */);
        }
        function getTypeOfNode(node) {
            if (isInsideWithStatementBody(node)) {
                // We cannot answer semantic questions within a with block, do not proceed any further
                return unknownType;
            }
            if (ts.isTypeNode(node)) {
                return getTypeFromTypeNode(node);
            }
            if (ts.isExpression(node)) {
                return getTypeOfExpression(node);
            }
            if (ts.isExpressionWithTypeArgumentsInClassExtendsClause(node)) {
                // A SyntaxKind.ExpressionWithTypeArguments is considered a type node, except when it occurs in the
                // extends clause of a class. We handle that case here.
                return getBaseTypes(getDeclaredTypeOfSymbol(getSymbolOfNode(node.parent.parent)))[0];
            }
            if (isTypeDeclaration(node)) {
                // In this case, we call getSymbolOfNode instead of getSymbolAtLocation because it is a declaration
                var symbol = getSymbolOfNode(node);
                return getDeclaredTypeOfSymbol(symbol);
            }
            if (isTypeDeclarationName(node)) {
                var symbol = getSymbolAtLocation(node);
                return symbol && getDeclaredTypeOfSymbol(symbol);
            }
            if (ts.isDeclaration(node)) {
                // In this case, we call getSymbolOfNode instead of getSymbolAtLocation because it is a declaration
                var symbol = getSymbolOfNode(node);
                return getTypeOfSymbol(symbol);
            }
            if (ts.isDeclarationName(node)) {
                var symbol = getSymbolAtLocation(node);
                return symbol && getTypeOfSymbol(symbol);
            }
            if (ts.isBindingPattern(node)) {
                return getTypeForVariableLikeDeclaration(node.parent);
            }
            if (isInRightSideOfImportOrExportAssignment(node)) {
                var symbol = getSymbolAtLocation(node);
                var declaredType = symbol && getDeclaredTypeOfSymbol(symbol);
                return declaredType !== unknownType ? declaredType : getTypeOfSymbol(symbol);
            }
            return unknownType;
        }
        function getTypeOfExpression(expr) {
            if (ts.isRightSideOfQualifiedNameOrPropertyAccess(expr)) {
                expr = expr.parent;
            }
            return checkExpression(expr);
        }
        /**
          * Gets either the static or instance type of a class element, based on
          * whether the element is declared as "static".
          */
        function getParentTypeOfClassElement(node) {
            var classSymbol = getSymbolOfNode(node.parent);
            return node.flags & 64 /* Static */
                ? getTypeOfSymbol(classSymbol)
                : getDeclaredTypeOfSymbol(classSymbol);
        }
        // Return the list of properties of the given type, augmented with properties from Function
        // if the type has call or construct signatures
        function getAugmentedPropertiesOfType(type) {
            type = getApparentType(type);
            var propsByName = createSymbolTable(getPropertiesOfType(type));
            if (getSignaturesOfType(type, 0 /* Call */).length || getSignaturesOfType(type, 1 /* Construct */).length) {
                ts.forEach(getPropertiesOfType(globalFunctionType), function (p) {
                    if (!ts.hasProperty(propsByName, p.name)) {
                        propsByName[p.name] = p;
                    }
                });
            }
            return getNamedMembers(propsByName);
        }
        function getRootSymbols(symbol) {
            if (symbol.flags & 268435456 /* SyntheticProperty */) {
                var symbols_3 = [];
                var name_10 = symbol.name;
                ts.forEach(getSymbolLinks(symbol).containingType.types, function (t) {
                    var symbol = getPropertyOfType(t, name_10);
                    if (symbol) {
                        symbols_3.push(symbol);
                    }
                });
                return symbols_3;
            }
            else if (symbol.flags & 67108864 /* Transient */) {
                var target = getSymbolLinks(symbol).target;
                if (target) {
                    return [target];
                }
            }
            return [symbol];
        }
        // Emitter support
        function isArgumentsLocalBinding(node) {
            return getReferencedValueSymbol(node) === argumentsSymbol;
        }
        function moduleExportsSomeValue(moduleReferenceExpression) {
            var moduleSymbol = resolveExternalModuleName(moduleReferenceExpression.parent, moduleReferenceExpression);
            if (!moduleSymbol) {
                // module not found - be conservative
                return true;
            }
            var hasExportAssignment = hasExportAssignmentSymbol(moduleSymbol);
            // if module has export assignment then 'resolveExternalModuleSymbol' will return resolved symbol for export assignment
            // otherwise it will return moduleSymbol itself
            moduleSymbol = resolveExternalModuleSymbol(moduleSymbol);
            var symbolLinks = getSymbolLinks(moduleSymbol);
            if (symbolLinks.exportsSomeValue === undefined) {
                // for export assignments - check if resolved symbol for RHS is itself a value
                // otherwise - check if at least one export is value
                symbolLinks.exportsSomeValue = hasExportAssignment
                    ? !!(moduleSymbol.flags & 107455 /* Value */)
                    : ts.forEachValue(getExportsOfModule(moduleSymbol), isValue);
            }
            return symbolLinks.exportsSomeValue;
            function isValue(s) {
                s = resolveSymbol(s);
                return s && !!(s.flags & 107455 /* Value */);
            }
        }
        // When resolved as an expression identifier, if the given node references an exported entity, return the declaration
        // node of the exported entity's container. Otherwise, return undefined.
        function getReferencedExportContainer(node) {
            var symbol = getReferencedValueSymbol(node);
            if (symbol) {
                if (symbol.flags & 1048576 /* ExportValue */) {
                    // If we reference an exported entity within the same module declaration, then whether
                    // we prefix depends on the kind of entity. SymbolFlags.ExportHasLocal encompasses all the
                    // kinds that we do NOT prefix.
                    var exportSymbol = getMergedSymbol(symbol.exportSymbol);
                    if (exportSymbol.flags & 944 /* ExportHasLocal */) {
                        return undefined;
                    }
                    symbol = exportSymbol;
                }
                var parentSymbol = getParentOfSymbol(symbol);
                if (parentSymbol) {
                    if (parentSymbol.flags & 512 /* ValueModule */ && parentSymbol.valueDeclaration.kind === 251 /* SourceFile */) {
                        return parentSymbol.valueDeclaration;
                    }
                    for (var n = node.parent; n; n = n.parent) {
                        if ((n.kind === 221 /* ModuleDeclaration */ || n.kind === 220 /* EnumDeclaration */) && getSymbolOfNode(n) === parentSymbol) {
                            return n;
                        }
                    }
                }
            }
        }
        // When resolved as an expression identifier, if the given node references an import, return the declaration of
        // that import. Otherwise, return undefined.
        function getReferencedImportDeclaration(node) {
            var symbol = getReferencedValueSymbol(node);
            return symbol && symbol.flags & 8388608 /* Alias */ ? getDeclarationOfAliasSymbol(symbol) : undefined;
        }
        function isSymbolOfDeclarationWithCollidingName(symbol) {
            if (symbol.flags & 418 /* BlockScoped */) {
                var links = getSymbolLinks(symbol);
                if (links.isDeclaratonWithCollidingName === undefined) {
                    var container = ts.getEnclosingBlockScopeContainer(symbol.valueDeclaration);
                    if (ts.isStatementWithLocals(container)) {
                        var nodeLinks_1 = getNodeLinks(symbol.valueDeclaration);
                        if (!!resolveName(container.parent, symbol.name, 107455 /* Value */, /*nameNotFoundMessage*/ undefined, /*nameArg*/ undefined)) {
                            // redeclaration - always should be renamed
                            links.isDeclaratonWithCollidingName = true;
                        }
                        else if (nodeLinks_1.flags & 131072 /* CapturedBlockScopedBinding */) {
                            // binding is captured in the function
                            // should be renamed if:
                            // - binding is not top level - top level bindings never collide with anything
                            // AND
                            //   - binding is not declared in loop, should be renamed to avoid name reuse across siblings
                            //     let a, b
                            //     { let x = 1; a = () => x;  }
                            //     { let x = 100; b = () => x; }
                            //     console.log(a()); // should print '1'
                            //     console.log(b()); // should print '100'
                            //     OR
                            //   - binding is declared inside loop but not in inside initializer of iteration statement or directly inside loop body
                            //     * variables from initializer are passed to rewritted loop body as parameters so they are not captured directly
                            //     * variables that are declared immediately in loop body will become top level variable after loop is rewritten and thus
                            //       they will not collide with anything
                            var isDeclaredInLoop = nodeLinks_1.flags & 262144 /* BlockScopedBindingInLoop */;
                            var inLoopInitializer = ts.isIterationStatement(container, /*lookInLabeledStatements*/ false);
                            var inLoopBodyBlock = container.kind === 195 /* Block */ && ts.isIterationStatement(container.parent, /*lookInLabeledStatements*/ false);
                            links.isDeclaratonWithCollidingName = !ts.isBlockScopedContainerTopLevel(container) && (!isDeclaredInLoop || (!inLoopInitializer && !inLoopBodyBlock));
                        }
                        else {
                            links.isDeclaratonWithCollidingName = false;
                        }
                    }
                }
                return links.isDeclaratonWithCollidingName;
            }
            return false;
        }
        // When resolved as an expression identifier, if the given node references a nested block scoped entity with
        // a name that either hides an existing name or might hide it when compiled downlevel,
        // return the declaration of that entity. Otherwise, return undefined.
        function getReferencedDeclarationWithCollidingName(node) {
            var symbol = getReferencedValueSymbol(node);
            return symbol && isSymbolOfDeclarationWithCollidingName(symbol) ? symbol.valueDeclaration : undefined;
        }
        // Return true if the given node is a declaration of a nested block scoped entity with a name that either hides an
        // existing name or might hide a name when compiled downlevel
        function isDeclarationWithCollidingName(node) {
            return isSymbolOfDeclarationWithCollidingName(getSymbolOfNode(node));
        }
        function isValueAliasDeclaration(node) {
            switch (node.kind) {
                case 224 /* ImportEqualsDeclaration */:
                case 226 /* ImportClause */:
                case 227 /* NamespaceImport */:
                case 229 /* ImportSpecifier */:
                case 233 /* ExportSpecifier */:
                    return isAliasResolvedToValue(getSymbolOfNode(node));
                case 231 /* ExportDeclaration */:
                    var exportClause = node.exportClause;
                    return exportClause && ts.forEach(exportClause.elements, isValueAliasDeclaration);
                case 230 /* ExportAssignment */:
                    return node.expression && node.expression.kind === 69 /* Identifier */ ? isAliasResolvedToValue(getSymbolOfNode(node)) : true;
            }
            return false;
        }
        function isTopLevelValueImportEqualsWithEntityName(node) {
            if (node.parent.kind !== 251 /* SourceFile */ || !ts.isInternalModuleImportEqualsDeclaration(node)) {
                // parent is not source file or it is not reference to internal module
                return false;
            }
            var isValue = isAliasResolvedToValue(getSymbolOfNode(node));
            return isValue && node.moduleReference && !ts.nodeIsMissing(node.moduleReference);
        }
        function isAliasResolvedToValue(symbol) {
            var target = resolveAlias(symbol);
            if (target === unknownSymbol && compilerOptions.isolatedModules) {
                return true;
            }
            // const enums and modules that contain only const enums are not considered values from the emit perespective
            // unless 'preserveConstEnums' option is set to true
            return target !== unknownSymbol &&
                target &&
                target.flags & 107455 /* Value */ &&
                (compilerOptions.preserveConstEnums || !isConstEnumOrConstEnumOnlyModule(target));
        }
        function isConstEnumOrConstEnumOnlyModule(s) {
            return isConstEnumSymbol(s) || s.constEnumOnlyModule;
        }
        function isReferencedAliasDeclaration(node, checkChildren) {
            if (ts.isAliasSymbolDeclaration(node)) {
                var symbol = getSymbolOfNode(node);
                if (getSymbolLinks(symbol).referenced) {
                    return true;
                }
            }
            if (checkChildren) {
                return ts.forEachChild(node, function (node) { return isReferencedAliasDeclaration(node, checkChildren); });
            }
            return false;
        }
        function isImplementationOfOverload(node) {
            if (ts.nodeIsPresent(node.body)) {
                var symbol = getSymbolOfNode(node);
                var signaturesOfSymbol = getSignaturesOfSymbol(symbol);
                // If this function body corresponds to function with multiple signature, it is implementation of overload
                // e.g.: function foo(a: string): string;
                //       function foo(a: number): number;
                //       function foo(a: any) { // This is implementation of the overloads
                //           return a;
                //       }
                return signaturesOfSymbol.length > 1 ||
                    // If there is single signature for the symbol, it is overload if that signature isn't coming from the node
                    // e.g.: function foo(a: string): string;
                    //       function foo(a: any) { // This is implementation of the overloads
                    //           return a;
                    //       }
                    (signaturesOfSymbol.length === 1 && signaturesOfSymbol[0].declaration !== node);
            }
            return false;
        }
        function getNodeCheckFlags(node) {
            return getNodeLinks(node).flags;
        }
        function getEnumMemberValue(node) {
            computeEnumMemberValues(node.parent);
            return getNodeLinks(node).enumMemberValue;
        }
        function getConstantValue(node) {
            if (node.kind === 250 /* EnumMember */) {
                return getEnumMemberValue(node);
            }
            var symbol = getNodeLinks(node).resolvedSymbol;
            if (symbol && (symbol.flags & 8 /* EnumMember */)) {
                // inline property\index accesses only for const enums
                if (ts.isConstEnumDeclaration(symbol.valueDeclaration.parent)) {
                    return getEnumMemberValue(symbol.valueDeclaration);
                }
            }
            return undefined;
        }
        function isFunctionType(type) {
            return type.flags & 80896 /* ObjectType */ && getSignaturesOfType(type, 0 /* Call */).length > 0;
        }
        function getTypeReferenceSerializationKind(typeName) {
            // Resolve the symbol as a value to ensure the type can be reached at runtime during emit.
            var valueSymbol = resolveEntityName(typeName, 107455 /* Value */, /*ignoreErrors*/ true);
            var constructorType = valueSymbol ? getTypeOfSymbol(valueSymbol) : undefined;
            if (constructorType && isConstructorType(constructorType)) {
                return ts.TypeReferenceSerializationKind.TypeWithConstructSignatureAndValue;
            }
            // Resolve the symbol as a type so that we can provide a more useful hint for the type serializer.
            var typeSymbol = resolveEntityName(typeName, 793056 /* Type */, /*ignoreErrors*/ true);
            // We might not be able to resolve type symbol so use unknown type in that case (eg error case)
            if (!typeSymbol) {
                return ts.TypeReferenceSerializationKind.ObjectType;
            }
            var type = getDeclaredTypeOfSymbol(typeSymbol);
            if (type === unknownType) {
                return ts.TypeReferenceSerializationKind.Unknown;
            }
            else if (type.flags & 1 /* Any */) {
                return ts.TypeReferenceSerializationKind.ObjectType;
            }
            else if (allConstituentTypesHaveKind(type, 16 /* Void */)) {
                return ts.TypeReferenceSerializationKind.VoidType;
            }
            else if (allConstituentTypesHaveKind(type, 8 /* Boolean */)) {
                return ts.TypeReferenceSerializationKind.BooleanType;
            }
            else if (allConstituentTypesHaveKind(type, 132 /* NumberLike */)) {
                return ts.TypeReferenceSerializationKind.NumberLikeType;
            }
            else if (allConstituentTypesHaveKind(type, 258 /* StringLike */)) {
                return ts.TypeReferenceSerializationKind.StringLikeType;
            }
            else if (allConstituentTypesHaveKind(type, 8192 /* Tuple */)) {
                return ts.TypeReferenceSerializationKind.ArrayLikeType;
            }
            else if (allConstituentTypesHaveKind(type, 16777216 /* ESSymbol */)) {
                return ts.TypeReferenceSerializationKind.ESSymbolType;
            }
            else if (isFunctionType(type)) {
                return ts.TypeReferenceSerializationKind.TypeWithCallSignature;
            }
            else if (isArrayType(type)) {
                return ts.TypeReferenceSerializationKind.ArrayLikeType;
            }
            else {
                return ts.TypeReferenceSerializationKind.ObjectType;
            }
        }
        function writeTypeOfDeclaration(declaration, enclosingDeclaration, flags, writer) {
            // Get type of the symbol if this is the valid symbol otherwise get type at location
            var symbol = getSymbolOfNode(declaration);
            var type = symbol && !(symbol.flags & (2048 /* TypeLiteral */ | 131072 /* Signature */))
                ? getTypeOfSymbol(symbol)
                : unknownType;
            getSymbolDisplayBuilder().buildTypeDisplay(type, writer, enclosingDeclaration, flags);
        }
        function writeReturnTypeOfSignatureDeclaration(signatureDeclaration, enclosingDeclaration, flags, writer) {
            var signature = getSignatureFromDeclaration(signatureDeclaration);
            getSymbolDisplayBuilder().buildTypeDisplay(getReturnTypeOfSignature(signature), writer, enclosingDeclaration, flags);
        }
        function writeTypeOfExpression(expr, enclosingDeclaration, flags, writer) {
            var type = getTypeOfExpression(expr);
            getSymbolDisplayBuilder().buildTypeDisplay(type, writer, enclosingDeclaration, flags);
        }
        function hasGlobalName(name) {
            return ts.hasProperty(globals, name);
        }
        function getReferencedValueSymbol(reference) {
            return getNodeLinks(reference).resolvedSymbol ||
                resolveName(reference, reference.text, 107455 /* Value */ | 1048576 /* ExportValue */ | 8388608 /* Alias */, 
                /*nodeNotFoundMessage*/ undefined, /*nameArg*/ undefined);
        }
        function getReferencedValueDeclaration(reference) {
            ts.Debug.assert(!ts.nodeIsSynthesized(reference));
            var symbol = getReferencedValueSymbol(reference);
            return symbol && getExportSymbolOfValueSymbolIfExported(symbol).valueDeclaration;
        }
        function createResolver() {
            return {
                getReferencedExportContainer: getReferencedExportContainer,
                getReferencedImportDeclaration: getReferencedImportDeclaration,
                getReferencedDeclarationWithCollidingName: getReferencedDeclarationWithCollidingName,
                isDeclarationWithCollidingName: isDeclarationWithCollidingName,
                isValueAliasDeclaration: isValueAliasDeclaration,
                hasGlobalName: hasGlobalName,
                isReferencedAliasDeclaration: isReferencedAliasDeclaration,
                getNodeCheckFlags: getNodeCheckFlags,
                isTopLevelValueImportEqualsWithEntityName: isTopLevelValueImportEqualsWithEntityName,
                isDeclarationVisible: isDeclarationVisible,
                isImplementationOfOverload: isImplementationOfOverload,
                writeTypeOfDeclaration: writeTypeOfDeclaration,
                writeReturnTypeOfSignatureDeclaration: writeReturnTypeOfSignatureDeclaration,
                writeTypeOfExpression: writeTypeOfExpression,
                isSymbolAccessible: isSymbolAccessible,
                isEntityNameVisible: isEntityNameVisible,
                getConstantValue: getConstantValue,
                collectLinkedAliases: collectLinkedAliases,
                getReferencedValueDeclaration: getReferencedValueDeclaration,
                getTypeReferenceSerializationKind: getTypeReferenceSerializationKind,
                isOptionalParameter: isOptionalParameter,
                moduleExportsSomeValue: moduleExportsSomeValue,
                isArgumentsLocalBinding: isArgumentsLocalBinding,
                getExternalModuleFileFromDeclaration: getExternalModuleFileFromDeclaration
            };
        }
        function getExternalModuleFileFromDeclaration(declaration) {
            var specifier = ts.getExternalModuleName(declaration);
            var moduleSymbol = resolveExternalModuleNameWorker(specifier, specifier, /*moduleNotFoundError*/ undefined);
            if (!moduleSymbol) {
                return undefined;
            }
            return ts.getDeclarationOfKind(moduleSymbol, 251 /* SourceFile */);
        }
        function initializeTypeChecker() {
            // Bind all source files and propagate errors
            ts.forEach(host.getSourceFiles(), function (file) {
                ts.bindSourceFile(file, compilerOptions);
            });
            var augmentations;
            // Initialize global symbol table
            ts.forEach(host.getSourceFiles(), function (file) {
                if (!ts.isExternalOrCommonJsModule(file)) {
                    mergeSymbolTable(globals, file.locals);
                }
                if (file.moduleAugmentations.length) {
                    (augmentations || (augmentations = [])).push(file.moduleAugmentations);
                }
            });
            if (augmentations) {
                // merge module augmentations.
                // this needs to be done after global symbol table is initialized to make sure that all ambient modules are indexed
                for (var _i = 0, augmentations_1 = augmentations; _i < augmentations_1.length; _i++) {
                    var list = augmentations_1[_i];
                    for (var _a = 0, list_1 = list; _a < list_1.length; _a++) {
                        var augmentation = list_1[_a];
                        mergeModuleAugmentation(augmentation);
                    }
                }
            }
            // Setup global builtins
            addToSymbolTable(globals, builtinGlobals, ts.Diagnostics.Declaration_name_conflicts_with_built_in_global_identifier_0);
            getSymbolLinks(undefinedSymbol).type = undefinedType;
            getSymbolLinks(argumentsSymbol).type = getGlobalType("IArguments");
            getSymbolLinks(unknownSymbol).type = unknownType;
            // Initialize special types
            globalArrayType = getGlobalType("Array", /*arity*/ 1);
            globalObjectType = getGlobalType("Object");
            globalFunctionType = getGlobalType("Function");
            globalStringType = getGlobalType("String");
            globalNumberType = getGlobalType("Number");
            globalBooleanType = getGlobalType("Boolean");
            globalRegExpType = getGlobalType("RegExp");
            jsxElementType = getExportedTypeFromNamespace("JSX", JsxNames.Element);
            getGlobalClassDecoratorType = ts.memoize(function () { return getGlobalType("ClassDecorator"); });
            getGlobalPropertyDecoratorType = ts.memoize(function () { return getGlobalType("PropertyDecorator"); });
            getGlobalMethodDecoratorType = ts.memoize(function () { return getGlobalType("MethodDecorator"); });
            getGlobalParameterDecoratorType = ts.memoize(function () { return getGlobalType("ParameterDecorator"); });
            getGlobalTypedPropertyDescriptorType = ts.memoize(function () { return getGlobalType("TypedPropertyDescriptor", /*arity*/ 1); });
            getGlobalPromiseType = ts.memoize(function () { return getGlobalType("Promise", /*arity*/ 1); });
            tryGetGlobalPromiseType = ts.memoize(function () { return getGlobalSymbol("Promise", 793056 /* Type */, /*diagnostic*/ undefined) && getGlobalPromiseType(); });
            getGlobalPromiseLikeType = ts.memoize(function () { return getGlobalType("PromiseLike", /*arity*/ 1); });
            getInstantiatedGlobalPromiseLikeType = ts.memoize(createInstantiatedPromiseLikeType);
            getGlobalPromiseConstructorSymbol = ts.memoize(function () { return getGlobalValueSymbol("Promise"); });
            getGlobalPromiseConstructorLikeType = ts.memoize(function () { return getGlobalType("PromiseConstructorLike"); });
            getGlobalThenableType = ts.memoize(createThenableType);
            // If we're in ES6 mode, load the TemplateStringsArray.
            // Otherwise, default to 'unknown' for the purposes of type checking in LS scenarios.
            if (languageVersion >= 2 /* ES6 */) {
                globalTemplateStringsArrayType = getGlobalType("TemplateStringsArray");
                globalESSymbolType = getGlobalType("Symbol");
                globalESSymbolConstructorSymbol = getGlobalValueSymbol("Symbol");
                globalIterableType = getGlobalType("Iterable", /*arity*/ 1);
                globalIteratorType = getGlobalType("Iterator", /*arity*/ 1);
                globalIterableIteratorType = getGlobalType("IterableIterator", /*arity*/ 1);
            }
            else {
                globalTemplateStringsArrayType = unknownType;
                // Consider putting Symbol interface in lib.d.ts. On the plus side, putting it in lib.d.ts would make it
                // extensible for Polyfilling Symbols. But putting it into lib.d.ts could also break users that have
                // a global Symbol already, particularly if it is a class.
                globalESSymbolType = createAnonymousType(undefined, emptySymbols, emptyArray, emptyArray, undefined, undefined);
                globalESSymbolConstructorSymbol = undefined;
                globalIterableType = emptyGenericType;
                globalIteratorType = emptyGenericType;
                globalIterableIteratorType = emptyGenericType;
            }
            anyArrayType = createArrayType(anyType);
        }
        function createInstantiatedPromiseLikeType() {
            var promiseLikeType = getGlobalPromiseLikeType();
            if (promiseLikeType !== emptyGenericType) {
                return createTypeReference(promiseLikeType, [anyType]);
            }
            return emptyObjectType;
        }
        function createThenableType() {
            // build the thenable type that is used to verify against a non-promise "thenable" operand to `await`.
            var thenPropertySymbol = createSymbol(67108864 /* Transient */ | 4 /* Property */, "then");
            getSymbolLinks(thenPropertySymbol).type = globalFunctionType;
            var thenableType = createObjectType(65536 /* Anonymous */);
            thenableType.properties = [thenPropertySymbol];
            thenableType.members = createSymbolTable(thenableType.properties);
            thenableType.callSignatures = [];
            thenableType.constructSignatures = [];
            return thenableType;
        }
        // GRAMMAR CHECKING
        function checkGrammarDecorators(node) {
            if (!node.decorators) {
                return false;
            }
            if (!ts.nodeCanBeDecorated(node)) {
                if (node.kind === 144 /* MethodDeclaration */ && !ts.nodeIsPresent(node.body)) {
                    return grammarErrorOnFirstToken(node, ts.Diagnostics.A_decorator_can_only_decorate_a_method_implementation_not_an_overload);
                }
                else {
                    return grammarErrorOnFirstToken(node, ts.Diagnostics.Decorators_are_not_valid_here);
                }
            }
            else if (node.kind === 146 /* GetAccessor */ || node.kind === 147 /* SetAccessor */) {
                var accessors = ts.getAllAccessorDeclarations(node.parent.members, node);
                if (accessors.firstAccessor.decorators && node === accessors.secondAccessor) {
                    return grammarErrorOnFirstToken(node, ts.Diagnostics.Decorators_cannot_be_applied_to_multiple_get_Slashset_accessors_of_the_same_name);
                }
            }
            return false;
        }
        function checkGrammarModifiers(node) {
            switch (node.kind) {
                case 146 /* GetAccessor */:
                case 147 /* SetAccessor */:
                case 145 /* Constructor */:
                case 142 /* PropertyDeclaration */:
                case 141 /* PropertySignature */:
                case 144 /* MethodDeclaration */:
                case 143 /* MethodSignature */:
                case 150 /* IndexSignature */:
                case 221 /* ModuleDeclaration */:
                case 225 /* ImportDeclaration */:
                case 224 /* ImportEqualsDeclaration */:
                case 231 /* ExportDeclaration */:
                case 230 /* ExportAssignment */:
                case 139 /* Parameter */:
                    break;
                case 216 /* FunctionDeclaration */:
                    if (node.modifiers && (node.modifiers.length > 1 || node.modifiers[0].kind !== 118 /* AsyncKeyword */) &&
                        node.parent.kind !== 222 /* ModuleBlock */ && node.parent.kind !== 251 /* SourceFile */) {
                        return grammarErrorOnFirstToken(node, ts.Diagnostics.Modifiers_cannot_appear_here);
                    }
                    break;
                case 217 /* ClassDeclaration */:
                case 218 /* InterfaceDeclaration */:
                case 196 /* VariableStatement */:
                case 219 /* TypeAliasDeclaration */:
                    if (node.modifiers && node.parent.kind !== 222 /* ModuleBlock */ && node.parent.kind !== 251 /* SourceFile */) {
                        return grammarErrorOnFirstToken(node, ts.Diagnostics.Modifiers_cannot_appear_here);
                    }
                    break;
                case 220 /* EnumDeclaration */:
                    if (node.modifiers && (node.modifiers.length > 1 || node.modifiers[0].kind !== 74 /* ConstKeyword */) &&
                        node.parent.kind !== 222 /* ModuleBlock */ && node.parent.kind !== 251 /* SourceFile */) {
                        return grammarErrorOnFirstToken(node, ts.Diagnostics.Modifiers_cannot_appear_here);
                    }
                    break;
                default:
                    return false;
            }
            if (!node.modifiers) {
                return;
            }
            var lastStatic, lastPrivate, lastProtected, lastDeclare, lastAsync;
            var flags = 0;
            for (var _i = 0, _a = node.modifiers; _i < _a.length; _i++) {
                var modifier = _a[_i];
                switch (modifier.kind) {
                    case 74 /* ConstKeyword */:
                        if (node.kind !== 220 /* EnumDeclaration */ && node.parent.kind === 217 /* ClassDeclaration */) {
                            return grammarErrorOnNode(node, ts.Diagnostics.A_class_member_cannot_have_the_0_keyword, ts.tokenToString(74 /* ConstKeyword */));
                        }
                        break;
                    case 112 /* PublicKeyword */:
                    case 111 /* ProtectedKeyword */:
                    case 110 /* PrivateKeyword */:
                        var text = void 0;
                        if (modifier.kind === 112 /* PublicKeyword */) {
                            text = "public";
                        }
                        else if (modifier.kind === 111 /* ProtectedKeyword */) {
                            text = "protected";
                            lastProtected = modifier;
                        }
                        else {
                            text = "private";
                            lastPrivate = modifier;
                        }
                        if (flags & 56 /* AccessibilityModifier */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics.Accessibility_modifier_already_seen);
                        }
                        else if (flags & 64 /* Static */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, text, "static");
                        }
                        else if (flags & 256 /* Async */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, text, "async");
                        }
                        else if (node.parent.kind === 222 /* ModuleBlock */ || node.parent.kind === 251 /* SourceFile */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_module_element, text);
                        }
                        else if (flags & 128 /* Abstract */) {
                            if (modifier.kind === 110 /* PrivateKeyword */) {
                                return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_be_used_with_1_modifier, text, "abstract");
                            }
                            else {
                                return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, text, "abstract");
                            }
                        }
                        flags |= ts.modifierToFlag(modifier.kind);
                        break;
                    case 113 /* StaticKeyword */:
                        if (flags & 64 /* Static */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_already_seen, "static");
                        }
                        else if (flags & 256 /* Async */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, "static", "async");
                        }
                        else if (node.parent.kind === 222 /* ModuleBlock */ || node.parent.kind === 251 /* SourceFile */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_module_element, "static");
                        }
                        else if (node.kind === 139 /* Parameter */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_parameter, "static");
                        }
                        else if (flags & 128 /* Abstract */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_be_used_with_1_modifier, "static", "abstract");
                        }
                        flags |= 64 /* Static */;
                        lastStatic = modifier;
                        break;
                    case 82 /* ExportKeyword */:
                        if (flags & 2 /* Export */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_already_seen, "export");
                        }
                        else if (flags & 4 /* Ambient */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, "export", "declare");
                        }
                        else if (flags & 128 /* Abstract */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, "export", "abstract");
                        }
                        else if (flags & 256 /* Async */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_must_precede_1_modifier, "export", "async");
                        }
                        else if (node.parent.kind === 217 /* ClassDeclaration */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_class_element, "export");
                        }
                        else if (node.kind === 139 /* Parameter */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_parameter, "export");
                        }
                        flags |= 2 /* Export */;
                        break;
                    case 122 /* DeclareKeyword */:
                        if (flags & 4 /* Ambient */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_already_seen, "declare");
                        }
                        else if (flags & 256 /* Async */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_be_used_in_an_ambient_context, "async");
                        }
                        else if (node.parent.kind === 217 /* ClassDeclaration */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_class_element, "declare");
                        }
                        else if (node.kind === 139 /* Parameter */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_parameter, "declare");
                        }
                        else if (ts.isInAmbientContext(node.parent) && node.parent.kind === 222 /* ModuleBlock */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics.A_declare_modifier_cannot_be_used_in_an_already_ambient_context);
                        }
                        flags |= 4 /* Ambient */;
                        lastDeclare = modifier;
                        break;
                    case 115 /* AbstractKeyword */:
                        if (flags & 128 /* Abstract */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_already_seen, "abstract");
                        }
                        if (node.kind !== 217 /* ClassDeclaration */) {
                            if (node.kind !== 144 /* MethodDeclaration */) {
                                return grammarErrorOnNode(modifier, ts.Diagnostics.abstract_modifier_can_only_appear_on_a_class_or_method_declaration);
                            }
                            if (!(node.parent.kind === 217 /* ClassDeclaration */ && node.parent.flags & 128 /* Abstract */)) {
                                return grammarErrorOnNode(modifier, ts.Diagnostics.Abstract_methods_can_only_appear_within_an_abstract_class);
                            }
                            if (flags & 64 /* Static */) {
                                return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_be_used_with_1_modifier, "static", "abstract");
                            }
                            if (flags & 16 /* Private */) {
                                return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_be_used_with_1_modifier, "private", "abstract");
                            }
                        }
                        flags |= 128 /* Abstract */;
                        break;
                    case 118 /* AsyncKeyword */:
                        if (flags & 256 /* Async */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_already_seen, "async");
                        }
                        else if (flags & 4 /* Ambient */ || ts.isInAmbientContext(node.parent)) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_be_used_in_an_ambient_context, "async");
                        }
                        else if (node.kind === 139 /* Parameter */) {
                            return grammarErrorOnNode(modifier, ts.Diagnostics._0_modifier_cannot_appear_on_a_parameter, "async");
                        }
                        flags |= 256 /* Async */;
                        lastAsync = modifier;
                        break;
                }
            }
            if (node.kind === 145 /* Constructor */) {
                if (flags & 64 /* Static */) {
                    return grammarErrorOnNode(lastStatic, ts.Diagnostics._0_modifier_cannot_appear_on_a_constructor_declaration, "static");
                }
                if (flags & 128 /* Abstract */) {
                    return grammarErrorOnNode(lastStatic, ts.Diagnostics._0_modifier_cannot_appear_on_a_constructor_declaration, "abstract");
                }
                else if (flags & 32 /* Protected */) {
                    return grammarErrorOnNode(lastProtected, ts.Diagnostics._0_modifier_cannot_appear_on_a_constructor_declaration, "protected");
                }
                else if (flags & 16 /* Private */) {
                    return grammarErrorOnNode(lastPrivate, ts.Diagnostics._0_modifier_cannot_appear_on_a_constructor_declaration, "private");
                }
                else if (flags & 256 /* Async */) {
                    return grammarErrorOnNode(lastAsync, ts.Diagnostics._0_modifier_cannot_appear_on_a_constructor_declaration, "async");
                }
                return;
            }
            else if ((node.kind === 225 /* ImportDeclaration */ || node.kind === 224 /* ImportEqualsDeclaration */) && flags & 4 /* Ambient */) {
                return grammarErrorOnNode(lastDeclare, ts.Diagnostics.A_0_modifier_cannot_be_used_with_an_import_declaration, "declare");
            }
            else if (node.kind === 139 /* Parameter */ && (flags & 56 /* AccessibilityModifier */) && ts.isBindingPattern(node.name)) {
                return grammarErrorOnNode(node, ts.Diagnostics.A_parameter_property_may_not_be_a_binding_pattern);
            }
            if (flags & 256 /* Async */) {
                return checkGrammarAsyncModifier(node, lastAsync);
            }
        }
        function checkGrammarAsyncModifier(node, asyncModifier) {
            if (languageVersion < 2 /* ES6 */) {
                return grammarErrorOnNode(asyncModifier, ts.Diagnostics.Async_functions_are_only_available_when_targeting_ECMAScript_6_and_higher);
            }
            switch (node.kind) {
                case 144 /* MethodDeclaration */:
                case 216 /* FunctionDeclaration */:
                case 176 /* FunctionExpression */:
                case 177 /* ArrowFunction */:
                    if (!node.asteriskToken) {
                        return false;
                    }
                    break;
            }
            return grammarErrorOnNode(asyncModifier, ts.Diagnostics._0_modifier_cannot_be_used_here, "async");
        }
        function checkGrammarForDisallowedTrailingComma(list) {
            if (list && list.hasTrailingComma) {
                var start = list.end - ",".length;
                var end = list.end;
                var sourceFile = ts.getSourceFileOfNode(list[0]);
                return grammarErrorAtPos(sourceFile, start, end - start, ts.Diagnostics.Trailing_comma_not_allowed);
            }
        }
        function checkGrammarTypeParameterList(node, typeParameters, file) {
            if (checkGrammarForDisallowedTrailingComma(typeParameters)) {
                return true;
            }
            if (typeParameters && typeParameters.length === 0) {
                var start = typeParameters.pos - "<".length;
                var end = ts.skipTrivia(file.text, typeParameters.end) + ">".length;
                return grammarErrorAtPos(file, start, end - start, ts.Diagnostics.Type_parameter_list_cannot_be_empty);
            }
        }
        function checkGrammarParameterList(parameters) {
            if (checkGrammarForDisallowedTrailingComma(parameters)) {
                return true;
            }
            var seenOptionalParameter = false;
            var parameterCount = parameters.length;
            for (var i = 0; i < parameterCount; i++) {
                var parameter = parameters[i];
                if (parameter.dotDotDotToken) {
                    if (i !== (parameterCount - 1)) {
                        return grammarErrorOnNode(parameter.dotDotDotToken, ts.Diagnostics.A_rest_parameter_must_be_last_in_a_parameter_list);
                    }
                    if (ts.isBindingPattern(parameter.name)) {
                        return grammarErrorOnNode(parameter.name, ts.Diagnostics.A_rest_element_cannot_contain_a_binding_pattern);
                    }
                    if (parameter.questionToken) {
                        return grammarErrorOnNode(parameter.questionToken, ts.Diagnostics.A_rest_parameter_cannot_be_optional);
                    }
                    if (parameter.initializer) {
                        return grammarErrorOnNode(parameter.name, ts.Diagnostics.A_rest_parameter_cannot_have_an_initializer);
                    }
                }
                else if (parameter.questionToken) {
                    seenOptionalParameter = true;
                    if (parameter.initializer) {
                        return grammarErrorOnNode(parameter.name, ts.Diagnostics.Parameter_cannot_have_question_mark_and_initializer);
                    }
                }
                else if (seenOptionalParameter && !parameter.initializer) {
                    return grammarErrorOnNode(parameter.name, ts.Diagnostics.A_required_parameter_cannot_follow_an_optional_parameter);
                }
            }
        }
        function checkGrammarFunctionLikeDeclaration(node) {
            // Prevent cascading error by short-circuit
            var file = ts.getSourceFileOfNode(node);
            return checkGrammarDecorators(node) || checkGrammarModifiers(node) || checkGrammarTypeParameterList(node, node.typeParameters, file) ||
                checkGrammarParameterList(node.parameters) || checkGrammarArrowFunction(node, file);
        }
        function checkGrammarArrowFunction(node, file) {
            if (node.kind === 177 /* ArrowFunction */) {
                var arrowFunction = node;
                var startLine = ts.getLineAndCharacterOfPosition(file, arrowFunction.equalsGreaterThanToken.pos).line;
                var endLine = ts.getLineAndCharacterOfPosition(file, arrowFunction.equalsGreaterThanToken.end).line;
                if (startLine !== endLine) {
                    return grammarErrorOnNode(arrowFunction.equalsGreaterThanToken, ts.Diagnostics.Line_terminator_not_permitted_before_arrow);
                }
            }
            return false;
        }
        function checkGrammarIndexSignatureParameters(node) {
            var parameter = node.parameters[0];
            if (node.parameters.length !== 1) {
                if (parameter) {
                    return grammarErrorOnNode(parameter.name, ts.Diagnostics.An_index_signature_must_have_exactly_one_parameter);
                }
                else {
                    return grammarErrorOnNode(node, ts.Diagnostics.An_index_signature_must_have_exactly_one_parameter);
                }
            }
            if (parameter.dotDotDotToken) {
                return grammarErrorOnNode(parameter.dotDotDotToken, ts.Diagnostics.An_index_signature_cannot_have_a_rest_parameter);
            }
            if (parameter.flags & 1022 /* Modifier */) {
                return grammarErrorOnNode(parameter.name, ts.Diagnostics.An_index_signature_parameter_cannot_have_an_accessibility_modifier);
            }
            if (parameter.questionToken) {
                return grammarErrorOnNode(parameter.questionToken, ts.Diagnostics.An_index_signature_parameter_cannot_have_a_question_mark);
            }
            if (parameter.initializer) {
                return grammarErrorOnNode(parameter.name, ts.Diagnostics.An_index_signature_parameter_cannot_have_an_initializer);
            }
            if (!parameter.type) {
                return grammarErrorOnNode(parameter.name, ts.Diagnostics.An_index_signature_parameter_must_have_a_type_annotation);
            }
            if (parameter.type.kind !== 130 /* StringKeyword */ && parameter.type.kind !== 128 /* NumberKeyword */) {
                return grammarErrorOnNode(parameter.name, ts.Diagnostics.An_index_signature_parameter_type_must_be_string_or_number);
            }
            if (!node.type) {
                return grammarErrorOnNode(node, ts.Diagnostics.An_index_signature_must_have_a_type_annotation);
            }
        }
        function checkGrammarForIndexSignatureModifier(node) {
            if (node.flags & 1022 /* Modifier */) {
                grammarErrorOnFirstToken(node, ts.Diagnostics.Modifiers_not_permitted_on_index_signature_members);
            }
        }
        function checkGrammarIndexSignature(node) {
            // Prevent cascading error by short-circuit
            return checkGrammarDecorators(node) || checkGrammarModifiers(node) || checkGrammarIndexSignatureParameters(node) || checkGrammarForIndexSignatureModifier(node);
        }
        function checkGrammarForAtLeastOneTypeArgument(node, typeArguments) {
            if (typeArguments && typeArguments.length === 0) {
                var sourceFile = ts.getSourceFileOfNode(node);
                var start = typeArguments.pos - "<".length;
                var end = ts.skipTrivia(sourceFile.text, typeArguments.end) + ">".length;
                return grammarErrorAtPos(sourceFile, start, end - start, ts.Diagnostics.Type_argument_list_cannot_be_empty);
            }
        }
        function checkGrammarTypeArguments(node, typeArguments) {
            return checkGrammarForDisallowedTrailingComma(typeArguments) ||
                checkGrammarForAtLeastOneTypeArgument(node, typeArguments);
        }
        function checkGrammarForOmittedArgument(node, args) {
            if (args) {
                var sourceFile = ts.getSourceFileOfNode(node);
                for (var _i = 0, args_1 = args; _i < args_1.length; _i++) {
                    var arg = args_1[_i];
                    if (arg.kind === 190 /* OmittedExpression */) {
                        return grammarErrorAtPos(sourceFile, arg.pos, 0, ts.Diagnostics.Argument_expression_expected);
                    }
                }
            }
        }
        function checkGrammarArguments(node, args) {
            return checkGrammarForDisallowedTrailingComma(args) ||
                checkGrammarForOmittedArgument(node, args);
        }
        function checkGrammarHeritageClause(node) {
            var types = node.types;
            if (checkGrammarForDisallowedTrailingComma(types)) {
                return true;
            }
            if (types && types.length === 0) {
                var listType = ts.tokenToString(node.token);
                var sourceFile = ts.getSourceFileOfNode(node);
                return grammarErrorAtPos(sourceFile, types.pos, 0, ts.Diagnostics._0_list_cannot_be_empty, listType);
            }
        }
        function checkGrammarClassDeclarationHeritageClauses(node) {
            var seenExtendsClause = false;
            var seenImplementsClause = false;
            if (!checkGrammarDecorators(node) && !checkGrammarModifiers(node) && node.heritageClauses) {
                for (var _i = 0, _a = node.heritageClauses; _i < _a.length; _i++) {
                    var heritageClause = _a[_i];
                    if (heritageClause.token === 83 /* ExtendsKeyword */) {
                        if (seenExtendsClause) {
                            return grammarErrorOnFirstToken(heritageClause, ts.Diagnostics.extends_clause_already_seen);
                        }
                        if (seenImplementsClause) {
                            return grammarErrorOnFirstToken(heritageClause, ts.Diagnostics.extends_clause_must_precede_implements_clause);
                        }
                        if (heritageClause.types.length > 1) {
                            return grammarErrorOnFirstToken(heritageClause.types[1], ts.Diagnostics.Classes_can_only_extend_a_single_class);
                        }
                        seenExtendsClause = true;
                    }
                    else {
                        ts.Debug.assert(heritageClause.token === 106 /* ImplementsKeyword */);
                        if (seenImplementsClause) {
                            return grammarErrorOnFirstToken(heritageClause, ts.Diagnostics.implements_clause_already_seen);
                        }
                        seenImplementsClause = true;
                    }
                    // Grammar checking heritageClause inside class declaration
                    checkGrammarHeritageClause(heritageClause);
                }
            }
        }
        function checkGrammarInterfaceDeclaration(node) {
            var seenExtendsClause = false;
            if (node.heritageClauses) {
                for (var _i = 0, _a = node.heritageClauses; _i < _a.length; _i++) {
                    var heritageClause = _a[_i];
                    if (heritageClause.token === 83 /* ExtendsKeyword */) {
                        if (seenExtendsClause) {
                            return grammarErrorOnFirstToken(heritageClause, ts.Diagnostics.extends_clause_already_seen);
                        }
                        seenExtendsClause = true;
                    }
                    else {
                        ts.Debug.assert(heritageClause.token === 106 /* ImplementsKeyword */);
                        return grammarErrorOnFirstToken(heritageClause, ts.Diagnostics.Interface_declaration_cannot_have_implements_clause);
                    }
                    // Grammar checking heritageClause inside class declaration
                    checkGrammarHeritageClause(heritageClause);
                }
            }
            return false;
        }
        function checkGrammarComputedPropertyName(node) {
            // If node is not a computedPropertyName, just skip the grammar checking
            if (node.kind !== 137 /* ComputedPropertyName */) {
                return false;
            }
            var computedPropertyName = node;
            if (computedPropertyName.expression.kind === 184 /* BinaryExpression */ && computedPropertyName.expression.operatorToken.kind === 24 /* CommaToken */) {
                return grammarErrorOnNode(computedPropertyName.expression, ts.Diagnostics.A_comma_expression_is_not_allowed_in_a_computed_property_name);
            }
        }
        function checkGrammarForGenerator(node) {
            if (node.asteriskToken) {
                ts.Debug.assert(node.kind === 216 /* FunctionDeclaration */ ||
                    node.kind === 176 /* FunctionExpression */ ||
                    node.kind === 144 /* MethodDeclaration */);
                if (ts.isInAmbientContext(node)) {
                    return grammarErrorOnNode(node.asteriskToken, ts.Diagnostics.Generators_are_not_allowed_in_an_ambient_context);
                }
                if (!node.body) {
                    return grammarErrorOnNode(node.asteriskToken, ts.Diagnostics.An_overload_signature_cannot_be_declared_as_a_generator);
                }
                if (languageVersion < 2 /* ES6 */) {
                    return grammarErrorOnNode(node.asteriskToken, ts.Diagnostics.Generators_are_only_available_when_targeting_ECMAScript_6_or_higher);
                }
            }
        }
        function checkGrammarForInvalidQuestionMark(node, questionToken, message) {
            if (questionToken) {
                return grammarErrorOnNode(questionToken, message);
            }
        }
        function checkGrammarObjectLiteralExpression(node, inDestructuring) {
            var seen = {};
            var Property = 1;
            var GetAccessor = 2;
            var SetAccesor = 4;
            var GetOrSetAccessor = GetAccessor | SetAccesor;
            var _loop_1 = function(prop) {
                var name_11 = prop.name;
                if (prop.kind === 190 /* OmittedExpression */ ||
                    name_11.kind === 137 /* ComputedPropertyName */) {
                    // If the name is not a ComputedPropertyName, the grammar checking will skip it
                    checkGrammarComputedPropertyName(name_11);
                    return "continue";
                }
                if (prop.kind === 249 /* ShorthandPropertyAssignment */ && !inDestructuring && prop.objectAssignmentInitializer) {
                    // having objectAssignmentInitializer is only valid in ObjectAssignmentPattern
                    // outside of destructuring it is a syntax error
                    return { value: grammarErrorOnNode(prop.equalsToken, ts.Diagnostics.can_only_be_used_in_an_object_literal_property_inside_a_destructuring_assignment) };
                }
                // Modifiers are never allowed on properties except for 'async' on a method declaration
                ts.forEach(prop.modifiers, function (mod) {
                    if (mod.kind !== 118 /* AsyncKeyword */ || prop.kind !== 144 /* MethodDeclaration */) {
                        grammarErrorOnNode(mod, ts.Diagnostics._0_modifier_cannot_be_used_here, ts.getTextOfNode(mod));
                    }
                });
                // ECMA-262 11.1.5 Object Initialiser
                // If previous is not undefined then throw a SyntaxError exception if any of the following conditions are true
                // a.This production is contained in strict code and IsDataDescriptor(previous) is true and
                // IsDataDescriptor(propId.descriptor) is true.
                //    b.IsDataDescriptor(previous) is true and IsAccessorDescriptor(propId.descriptor) is true.
                //    c.IsAccessorDescriptor(previous) is true and IsDataDescriptor(propId.descriptor) is true.
                //    d.IsAccessorDescriptor(previous) is true and IsAccessorDescriptor(propId.descriptor) is true
                // and either both previous and propId.descriptor have[[Get]] fields or both previous and propId.descriptor have[[Set]] fields
                var currentKind = void 0;
                if (prop.kind === 248 /* PropertyAssignment */ || prop.kind === 249 /* ShorthandPropertyAssignment */) {
                    // Grammar checking for computedPropertName and shorthandPropertyAssignment
                    checkGrammarForInvalidQuestionMark(prop, prop.questionToken, ts.Diagnostics.An_object_member_cannot_be_declared_optional);
                    if (name_11.kind === 8 /* NumericLiteral */) {
                        checkGrammarNumericLiteral(name_11);
                    }
                    currentKind = Property;
                }
                else if (prop.kind === 144 /* MethodDeclaration */) {
                    currentKind = Property;
                }
                else if (prop.kind === 146 /* GetAccessor */) {
                    currentKind = GetAccessor;
                }
                else if (prop.kind === 147 /* SetAccessor */) {
                    currentKind = SetAccesor;
                }
                else {
                    ts.Debug.fail("Unexpected syntax kind:" + prop.kind);
                }
                if (!ts.hasProperty(seen, name_11.text)) {
                    seen[name_11.text] = currentKind;
                }
                else {
                    var existingKind = seen[name_11.text];
                    if (currentKind === Property && existingKind === Property) {
                        return "continue";
                    }
                    else if ((currentKind & GetOrSetAccessor) && (existingKind & GetOrSetAccessor)) {
                        if (existingKind !== GetOrSetAccessor && currentKind !== existingKind) {
                            seen[name_11.text] = currentKind | existingKind;
                        }
                        else {
                            return { value: grammarErrorOnNode(name_11, ts.Diagnostics.An_object_literal_cannot_have_multiple_get_Slashset_accessors_with_the_same_name) };
                        }
                    }
                    else {
                        return { value: grammarErrorOnNode(name_11, ts.Diagnostics.An_object_literal_cannot_have_property_and_accessor_with_the_same_name) };
                    }
                }
            };
            for (var _i = 0, _a = node.properties; _i < _a.length; _i++) {
                var prop = _a[_i];
                var state_1 = _loop_1(prop);
                if (typeof state_1 === "object") return state_1.value;
                if (state_1 === "continue") continue;
            }
        }
        function checkGrammarJsxElement(node) {
            var seen = {};
            for (var _i = 0, _a = node.attributes; _i < _a.length; _i++) {
                var attr = _a[_i];
                if (attr.kind === 242 /* JsxSpreadAttribute */) {
                    continue;
                }
                var jsxAttr = attr;
                var name_12 = jsxAttr.name;
                if (!ts.hasProperty(seen, name_12.text)) {
                    seen[name_12.text] = true;
                }
                else {
                    return grammarErrorOnNode(name_12, ts.Diagnostics.JSX_elements_cannot_have_multiple_attributes_with_the_same_name);
                }
                var initializer = jsxAttr.initializer;
                if (initializer && initializer.kind === 243 /* JsxExpression */ && !initializer.expression) {
                    return grammarErrorOnNode(jsxAttr.initializer, ts.Diagnostics.JSX_attributes_must_only_be_assigned_a_non_empty_expression);
                }
            }
        }
        function checkGrammarForInOrForOfStatement(forInOrOfStatement) {
            if (checkGrammarStatementInAmbientContext(forInOrOfStatement)) {
                return true;
            }
            if (forInOrOfStatement.initializer.kind === 215 /* VariableDeclarationList */) {
                var variableList = forInOrOfStatement.initializer;
                if (!checkGrammarVariableDeclarationList(variableList)) {
                    var declarations = variableList.declarations;
                    // declarations.length can be zero if there is an error in variable declaration in for-of or for-in
                    // See http://www.ecma-international.org/ecma-262/6.0/#sec-for-in-and-for-of-statements for details
                    // For example:
                    //      var let = 10;
                    //      for (let of [1,2,3]) {} // this is invalid ES6 syntax
                    //      for (let in [1,2,3]) {} // this is invalid ES6 syntax
                    // We will then want to skip on grammar checking on variableList declaration
                    if (!declarations.length) {
                        return false;
                    }
                    if (declarations.length > 1) {
                        var diagnostic = forInOrOfStatement.kind === 203 /* ForInStatement */
                            ? ts.Diagnostics.Only_a_single_variable_declaration_is_allowed_in_a_for_in_statement
                            : ts.Diagnostics.Only_a_single_variable_declaration_is_allowed_in_a_for_of_statement;
                        return grammarErrorOnFirstToken(variableList.declarations[1], diagnostic);
                    }
                    var firstDeclaration = declarations[0];
                    if (firstDeclaration.initializer) {
                        var diagnostic = forInOrOfStatement.kind === 203 /* ForInStatement */
                            ? ts.Diagnostics.The_variable_declaration_of_a_for_in_statement_cannot_have_an_initializer
                            : ts.Diagnostics.The_variable_declaration_of_a_for_of_statement_cannot_have_an_initializer;
                        return grammarErrorOnNode(firstDeclaration.name, diagnostic);
                    }
                    if (firstDeclaration.type) {
                        var diagnostic = forInOrOfStatement.kind === 203 /* ForInStatement */
                            ? ts.Diagnostics.The_left_hand_side_of_a_for_in_statement_cannot_use_a_type_annotation
                            : ts.Diagnostics.The_left_hand_side_of_a_for_of_statement_cannot_use_a_type_annotation;
                        return grammarErrorOnNode(firstDeclaration, diagnostic);
                    }
                }
            }
            return false;
        }
        function checkGrammarAccessor(accessor) {
            var kind = accessor.kind;
            if (languageVersion < 1 /* ES5 */) {
                return grammarErrorOnNode(accessor.name, ts.Diagnostics.Accessors_are_only_available_when_targeting_ECMAScript_5_and_higher);
            }
            else if (ts.isInAmbientContext(accessor)) {
                return grammarErrorOnNode(accessor.name, ts.Diagnostics.An_accessor_cannot_be_declared_in_an_ambient_context);
            }
            else if (accessor.body === undefined) {
                return grammarErrorAtPos(ts.getSourceFileOfNode(accessor), accessor.end - 1, ";".length, ts.Diagnostics._0_expected, "{");
            }
            else if (accessor.typeParameters) {
                return grammarErrorOnNode(accessor.name, ts.Diagnostics.An_accessor_cannot_have_type_parameters);
            }
            else if (kind === 146 /* GetAccessor */ && accessor.parameters.length) {
                return grammarErrorOnNode(accessor.name, ts.Diagnostics.A_get_accessor_cannot_have_parameters);
            }
            else if (kind === 147 /* SetAccessor */) {
                if (accessor.type) {
                    return grammarErrorOnNode(accessor.name, ts.Diagnostics.A_set_accessor_cannot_have_a_return_type_annotation);
                }
                else if (accessor.parameters.length !== 1) {
                    return grammarErrorOnNode(accessor.name, ts.Diagnostics.A_set_accessor_must_have_exactly_one_parameter);
                }
                else {
                    var parameter = accessor.parameters[0];
                    if (parameter.dotDotDotToken) {
                        return grammarErrorOnNode(parameter.dotDotDotToken, ts.Diagnostics.A_set_accessor_cannot_have_rest_parameter);
                    }
                    else if (parameter.flags & 1022 /* Modifier */) {
                        return grammarErrorOnNode(accessor.name, ts.Diagnostics.A_parameter_property_is_only_allowed_in_a_constructor_implementation);
                    }
                    else if (parameter.questionToken) {
                        return grammarErrorOnNode(parameter.questionToken, ts.Diagnostics.A_set_accessor_cannot_have_an_optional_parameter);
                    }
                    else if (parameter.initializer) {
                        return grammarErrorOnNode(accessor.name, ts.Diagnostics.A_set_accessor_parameter_cannot_have_an_initializer);
                    }
                }
            }
        }
        function checkGrammarForNonSymbolComputedProperty(node, message) {
            if (ts.isDynamicName(node)) {
                return grammarErrorOnNode(node, message);
            }
        }
        function checkGrammarMethod(node) {
            if (checkGrammarDisallowedModifiersOnObjectLiteralExpressionMethod(node) ||
                checkGrammarFunctionLikeDeclaration(node) ||
                checkGrammarForGenerator(node)) {
                return true;
            }
            if (node.parent.kind === 168 /* ObjectLiteralExpression */) {
                if (checkGrammarForInvalidQuestionMark(node, node.questionToken, ts.Diagnostics.A_class_member_cannot_be_declared_optional)) {
                    return true;
                }
                else if (node.body === undefined) {
                    return grammarErrorAtPos(ts.getSourceFileOfNode(node), node.end - 1, ";".length, ts.Diagnostics._0_expected, "{");
                }
            }
            if (ts.isClassLike(node.parent)) {
                if (checkGrammarForInvalidQuestionMark(node, node.questionToken, ts.Diagnostics.A_class_member_cannot_be_declared_optional)) {
                    return true;
                }
                // Technically, computed properties in ambient contexts is disallowed
                // for property declarations and accessors too, not just methods.
                // However, property declarations disallow computed names in general,
                // and accessors are not allowed in ambient contexts in general,
                // so this error only really matters for methods.
                if (ts.isInAmbientContext(node)) {
                    return checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_an_ambient_context_must_directly_refer_to_a_built_in_symbol);
                }
                else if (!node.body) {
                    return checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_a_method_overload_must_directly_refer_to_a_built_in_symbol);
                }
            }
            else if (node.parent.kind === 218 /* InterfaceDeclaration */) {
                return checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_an_interface_must_directly_refer_to_a_built_in_symbol);
            }
            else if (node.parent.kind === 156 /* TypeLiteral */) {
                return checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_a_type_literal_must_directly_refer_to_a_built_in_symbol);
            }
        }
        function checkGrammarBreakOrContinueStatement(node) {
            var current = node;
            while (current) {
                if (ts.isFunctionLike(current)) {
                    return grammarErrorOnNode(node, ts.Diagnostics.Jump_target_cannot_cross_function_boundary);
                }
                switch (current.kind) {
                    case 210 /* LabeledStatement */:
                        if (node.label && current.label.text === node.label.text) {
                            // found matching label - verify that label usage is correct
                            // continue can only target labels that are on iteration statements
                            var isMisplacedContinueLabel = node.kind === 205 /* ContinueStatement */
                                && !ts.isIterationStatement(current.statement, /*lookInLabeledStatement*/ true);
                            if (isMisplacedContinueLabel) {
                                return grammarErrorOnNode(node, ts.Diagnostics.A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement);
                            }
                            return false;
                        }
                        break;
                    case 209 /* SwitchStatement */:
                        if (node.kind === 206 /* BreakStatement */ && !node.label) {
                            // unlabeled break within switch statement - ok
                            return false;
                        }
                        break;
                    default:
                        if (ts.isIterationStatement(current, /*lookInLabeledStatement*/ false) && !node.label) {
                            // unlabeled break or continue within iteration statement - ok
                            return false;
                        }
                        break;
                }
                current = current.parent;
            }
            if (node.label) {
                var message = node.kind === 206 /* BreakStatement */
                    ? ts.Diagnostics.A_break_statement_can_only_jump_to_a_label_of_an_enclosing_statement
                    : ts.Diagnostics.A_continue_statement_can_only_jump_to_a_label_of_an_enclosing_iteration_statement;
                return grammarErrorOnNode(node, message);
            }
            else {
                var message = node.kind === 206 /* BreakStatement */
                    ? ts.Diagnostics.A_break_statement_can_only_be_used_within_an_enclosing_iteration_or_switch_statement
                    : ts.Diagnostics.A_continue_statement_can_only_be_used_within_an_enclosing_iteration_statement;
                return grammarErrorOnNode(node, message);
            }
        }
        function checkGrammarBindingElement(node) {
            if (node.dotDotDotToken) {
                var elements = node.parent.elements;
                if (node !== ts.lastOrUndefined(elements)) {
                    return grammarErrorOnNode(node, ts.Diagnostics.A_rest_element_must_be_last_in_an_array_destructuring_pattern);
                }
                if (node.name.kind === 165 /* ArrayBindingPattern */ || node.name.kind === 164 /* ObjectBindingPattern */) {
                    return grammarErrorOnNode(node.name, ts.Diagnostics.A_rest_element_cannot_contain_a_binding_pattern);
                }
                if (node.initializer) {
                    // Error on equals token which immediate precedes the initializer
                    return grammarErrorAtPos(ts.getSourceFileOfNode(node), node.initializer.pos - 1, 1, ts.Diagnostics.A_rest_element_cannot_have_an_initializer);
                }
            }
        }
        function checkGrammarVariableDeclaration(node) {
            if (node.parent.parent.kind !== 203 /* ForInStatement */ && node.parent.parent.kind !== 204 /* ForOfStatement */) {
                if (ts.isInAmbientContext(node)) {
                    if (node.initializer) {
                        // Error on equals token which immediate precedes the initializer
                        var equalsTokenLength = "=".length;
                        return grammarErrorAtPos(ts.getSourceFileOfNode(node), node.initializer.pos - equalsTokenLength, equalsTokenLength, ts.Diagnostics.Initializers_are_not_allowed_in_ambient_contexts);
                    }
                }
                else if (!node.initializer) {
                    if (ts.isBindingPattern(node.name) && !ts.isBindingPattern(node.parent)) {
                        return grammarErrorOnNode(node, ts.Diagnostics.A_destructuring_declaration_must_have_an_initializer);
                    }
                    if (ts.isConst(node)) {
                        return grammarErrorOnNode(node, ts.Diagnostics.const_declarations_must_be_initialized);
                    }
                }
            }
            var checkLetConstNames = (ts.isLet(node) || ts.isConst(node));
            // 1. LexicalDeclaration : LetOrConst BindingList ;
            // It is a Syntax Error if the BoundNames of BindingList contains "let".
            // 2. ForDeclaration: ForDeclaration : LetOrConst ForBinding
            // It is a Syntax Error if the BoundNames of ForDeclaration contains "let".
            // It is a SyntaxError if a VariableDeclaration or VariableDeclarationNoIn occurs within strict code
            // and its Identifier is eval or arguments
            return checkLetConstNames && checkGrammarNameInLetOrConstDeclarations(node.name);
        }
        function checkGrammarNameInLetOrConstDeclarations(name) {
            if (name.kind === 69 /* Identifier */) {
                if (name.originalKeywordKind === 108 /* LetKeyword */) {
                    return grammarErrorOnNode(name, ts.Diagnostics.let_is_not_allowed_to_be_used_as_a_name_in_let_or_const_declarations);
                }
            }
            else {
                var elements = name.elements;
                for (var _i = 0, elements_2 = elements; _i < elements_2.length; _i++) {
                    var element = elements_2[_i];
                    if (element.kind !== 190 /* OmittedExpression */) {
                        checkGrammarNameInLetOrConstDeclarations(element.name);
                    }
                }
            }
        }
        function checkGrammarVariableDeclarationList(declarationList) {
            var declarations = declarationList.declarations;
            if (checkGrammarForDisallowedTrailingComma(declarationList.declarations)) {
                return true;
            }
            if (!declarationList.declarations.length) {
                return grammarErrorAtPos(ts.getSourceFileOfNode(declarationList), declarations.pos, declarations.end - declarations.pos, ts.Diagnostics.Variable_declaration_list_cannot_be_empty);
            }
        }
        function allowLetAndConstDeclarations(parent) {
            switch (parent.kind) {
                case 199 /* IfStatement */:
                case 200 /* DoStatement */:
                case 201 /* WhileStatement */:
                case 208 /* WithStatement */:
                case 202 /* ForStatement */:
                case 203 /* ForInStatement */:
                case 204 /* ForOfStatement */:
                    return false;
                case 210 /* LabeledStatement */:
                    return allowLetAndConstDeclarations(parent.parent);
            }
            return true;
        }
        function checkGrammarForDisallowedLetOrConstStatement(node) {
            if (!allowLetAndConstDeclarations(node.parent)) {
                if (ts.isLet(node.declarationList)) {
                    return grammarErrorOnNode(node, ts.Diagnostics.let_declarations_can_only_be_declared_inside_a_block);
                }
                else if (ts.isConst(node.declarationList)) {
                    return grammarErrorOnNode(node, ts.Diagnostics.const_declarations_can_only_be_declared_inside_a_block);
                }
            }
        }
        function hasParseDiagnostics(sourceFile) {
            return sourceFile.parseDiagnostics.length > 0;
        }
        function grammarErrorOnFirstToken(node, message, arg0, arg1, arg2) {
            var sourceFile = ts.getSourceFileOfNode(node);
            if (!hasParseDiagnostics(sourceFile)) {
                var span = ts.getSpanOfTokenAtPosition(sourceFile, node.pos);
                diagnostics.add(ts.createFileDiagnostic(sourceFile, span.start, span.length, message, arg0, arg1, arg2));
                return true;
            }
        }
        function grammarErrorAtPos(sourceFile, start, length, message, arg0, arg1, arg2) {
            if (!hasParseDiagnostics(sourceFile)) {
                diagnostics.add(ts.createFileDiagnostic(sourceFile, start, length, message, arg0, arg1, arg2));
                return true;
            }
        }
        function grammarErrorOnNode(node, message, arg0, arg1, arg2) {
            var sourceFile = ts.getSourceFileOfNode(node);
            if (!hasParseDiagnostics(sourceFile)) {
                diagnostics.add(ts.createDiagnosticForNode(node, message, arg0, arg1, arg2));
                return true;
            }
        }
        function checkGrammarConstructorTypeParameters(node) {
            if (node.typeParameters) {
                return grammarErrorAtPos(ts.getSourceFileOfNode(node), node.typeParameters.pos, node.typeParameters.end - node.typeParameters.pos, ts.Diagnostics.Type_parameters_cannot_appear_on_a_constructor_declaration);
            }
        }
        function checkGrammarConstructorTypeAnnotation(node) {
            if (node.type) {
                return grammarErrorOnNode(node.type, ts.Diagnostics.Type_annotation_cannot_appear_on_a_constructor_declaration);
            }
        }
        function checkGrammarProperty(node) {
            if (ts.isClassLike(node.parent)) {
                if (checkGrammarForInvalidQuestionMark(node, node.questionToken, ts.Diagnostics.A_class_member_cannot_be_declared_optional) ||
                    checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_a_class_property_declaration_must_directly_refer_to_a_built_in_symbol)) {
                    return true;
                }
            }
            else if (node.parent.kind === 218 /* InterfaceDeclaration */) {
                if (checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_an_interface_must_directly_refer_to_a_built_in_symbol)) {
                    return true;
                }
                if (node.initializer) {
                    return grammarErrorOnNode(node.initializer, ts.Diagnostics.An_interface_property_cannot_have_an_initializer);
                }
            }
            else if (node.parent.kind === 156 /* TypeLiteral */) {
                if (checkGrammarForNonSymbolComputedProperty(node.name, ts.Diagnostics.A_computed_property_name_in_a_type_literal_must_directly_refer_to_a_built_in_symbol)) {
                    return true;
                }
                if (node.initializer) {
                    return grammarErrorOnNode(node.initializer, ts.Diagnostics.A_type_literal_property_cannot_have_an_initializer);
                }
            }
            if (ts.isInAmbientContext(node) && node.initializer) {
                return grammarErrorOnFirstToken(node.initializer, ts.Diagnostics.Initializers_are_not_allowed_in_ambient_contexts);
            }
        }
        function checkGrammarTopLevelElementForRequiredDeclareModifier(node) {
            // A declare modifier is required for any top level .d.ts declaration except export=, export default,
            // interfaces and imports categories:
            //
            //  DeclarationElement:
            //     ExportAssignment
            //     export_opt   InterfaceDeclaration
            //     export_opt   TypeAliasDeclaration
            //     export_opt   ImportDeclaration
            //     export_opt   ExternalImportDeclaration
            //     export_opt   AmbientDeclaration
            //
            // TODO: The spec needs to be amended to reflect this grammar.
            if (node.kind === 218 /* InterfaceDeclaration */ ||
                node.kind === 219 /* TypeAliasDeclaration */ ||
                node.kind === 225 /* ImportDeclaration */ ||
                node.kind === 224 /* ImportEqualsDeclaration */ ||
                node.kind === 231 /* ExportDeclaration */ ||
                node.kind === 230 /* ExportAssignment */ ||
                (node.flags & 4 /* Ambient */) ||
                (node.flags & (2 /* Export */ | 512 /* Default */))) {
                return false;
            }
            return grammarErrorOnFirstToken(node, ts.Diagnostics.A_declare_modifier_is_required_for_a_top_level_declaration_in_a_d_ts_file);
        }
        function checkGrammarTopLevelElementsForRequiredDeclareModifier(file) {
            for (var _i = 0, _a = file.statements; _i < _a.length; _i++) {
                var decl = _a[_i];
                if (ts.isDeclaration(decl) || decl.kind === 196 /* VariableStatement */) {
                    if (checkGrammarTopLevelElementForRequiredDeclareModifier(decl)) {
                        return true;
                    }
                }
            }
        }
        function checkGrammarSourceFile(node) {
            return ts.isInAmbientContext(node) && checkGrammarTopLevelElementsForRequiredDeclareModifier(node);
        }
        function checkGrammarStatementInAmbientContext(node) {
            if (ts.isInAmbientContext(node)) {
                // An accessors is already reported about the ambient context
                if (isAccessor(node.parent.kind)) {
                    return getNodeLinks(node).hasReportedStatementInAmbientContext = true;
                }
                // Find containing block which is either Block, ModuleBlock, SourceFile
                var links = getNodeLinks(node);
                if (!links.hasReportedStatementInAmbientContext && ts.isFunctionLike(node.parent)) {
                    return getNodeLinks(node).hasReportedStatementInAmbientContext = grammarErrorOnFirstToken(node, ts.Diagnostics.An_implementation_cannot_be_declared_in_ambient_contexts);
                }
                // We are either parented by another statement, or some sort of block.
                // If we're in a block, we only want to really report an error once
                // to prevent noisyness.  So use a bit on the block to indicate if
                // this has already been reported, and don't report if it has.
                //
                if (node.parent.kind === 195 /* Block */ || node.parent.kind === 222 /* ModuleBlock */ || node.parent.kind === 251 /* SourceFile */) {
                    var links_1 = getNodeLinks(node.parent);
                    // Check if the containing block ever report this error
                    if (!links_1.hasReportedStatementInAmbientContext) {
                        return links_1.hasReportedStatementInAmbientContext = grammarErrorOnFirstToken(node, ts.Diagnostics.Statements_are_not_allowed_in_ambient_contexts);
                    }
                }
                else {
                }
            }
        }
        function checkGrammarNumericLiteral(node) {
            // Grammar checking
            if (node.flags & 32768 /* OctalLiteral */ && languageVersion >= 1 /* ES5 */) {
                return grammarErrorOnNode(node, ts.Diagnostics.Octal_literals_are_not_available_when_targeting_ECMAScript_5_and_higher);
            }
        }
        function grammarErrorAfterFirstToken(node, message, arg0, arg1, arg2) {
            var sourceFile = ts.getSourceFileOfNode(node);
            if (!hasParseDiagnostics(sourceFile)) {
                var span = ts.getSpanOfTokenAtPosition(sourceFile, node.pos);
                diagnostics.add(ts.createFileDiagnostic(sourceFile, ts.textSpanEnd(span), /*length*/ 0, message, arg0, arg1, arg2));
                return true;
            }
        }
        var _a;
    }
    ts.createTypeChecker = createTypeChecker;
})(ts || (ts = {}));
