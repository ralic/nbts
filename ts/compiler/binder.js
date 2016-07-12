// This file has been modified from the original for netbeanstypescript.
// Portions Copyrighted 2015 Everlaw
/// <reference path="utilities.ts"/>
/// <reference path="parser.ts"/>
/* @internal */
var ts;
(function (ts) {
    ts.bindTime = 0;
    function or(state1, state2) {
        return (state1 | state2) & 2 /* Reachable */
            ? 2 /* Reachable */
            : (state1 & state2) & 8 /* ReportedUnreachable */
                ? 8 /* ReportedUnreachable */
                : 4 /* Unreachable */;
    }
    function getModuleInstanceState(node) {
        // A module is uninstantiated if it contains only
        // 1. interface declarations, type alias declarations
        if (node.kind === 218 /* InterfaceDeclaration */ || node.kind === 219 /* TypeAliasDeclaration */) {
            return 0 /* NonInstantiated */;
        }
        else if (ts.isConstEnumDeclaration(node)) {
            return 2 /* ConstEnumOnly */;
        }
        else if ((node.kind === 225 /* ImportDeclaration */ || node.kind === 224 /* ImportEqualsDeclaration */) && !(node.flags & 2 /* Export */)) {
            return 0 /* NonInstantiated */;
        }
        else if (node.kind === 222 /* ModuleBlock */) {
            var state_1 = 0 /* NonInstantiated */;
            ts.forEachChild(node, function (n) {
                switch (getModuleInstanceState(n)) {
                    case 0 /* NonInstantiated */:
                        // child is non-instantiated - continue searching
                        return false;
                    case 2 /* ConstEnumOnly */:
                        // child is const enum only - record state and continue searching
                        state_1 = 2 /* ConstEnumOnly */;
                        return false;
                    case 1 /* Instantiated */:
                        // child is instantiated - record state and stop
                        state_1 = 1 /* Instantiated */;
                        return true;
                }
            });
            return state_1;
        }
        else if (node.kind === 221 /* ModuleDeclaration */) {
            return getModuleInstanceState(node.body);
        }
        else {
            return 1 /* Instantiated */;
        }
    }
    ts.getModuleInstanceState = getModuleInstanceState;
    var binder = createBinder();
    function bindSourceFile(file, options) {
        var start = new Date().getTime();
        binder(file, options);
        ts.bindTime += new Date().getTime() - start;
    }
    ts.bindSourceFile = bindSourceFile;
    function createBinder() {
        var file;
        var options;
        var parent;
        var container;
        var blockScopeContainer;
        var lastContainer;
        var seenThisKeyword;
        // state used by reachability checks
        var hasExplicitReturn;
        var currentReachabilityState;
        var labelStack;
        var labelIndexMap;
        var implicitLabels;
        // state used for emit helpers
        var hasClassExtends;
        var hasAsyncFunctions;
        var hasDecorators;
        var hasParameterDecorators;
        // If this file is an external module, then it is automatically in strict-mode according to
        // ES6.  If it is not an external module, then we'll determine if it is in strict mode or
        // not depending on if we see "use strict" in certain places (or if we hit a class/namespace).
        var inStrictMode;
        var symbolCount = 0;
        var Symbol;
        var classifiableNames;
        function bindSourceFile(f, opts) {
            file = f;
            options = opts;
            inStrictMode = !!file.externalModuleIndicator;
            classifiableNames = {};
            Symbol = ts.objectAllocator.getSymbolConstructor();
            if (!file.locals) {
                bind(file);
                file.symbolCount = symbolCount;
                file.classifiableNames = classifiableNames;
            }
            file = undefined;
            options = undefined;
            parent = undefined;
            container = undefined;
            blockScopeContainer = undefined;
            lastContainer = undefined;
            seenThisKeyword = false;
            hasExplicitReturn = false;
            labelStack = undefined;
            labelIndexMap = undefined;
            implicitLabels = undefined;
            hasClassExtends = false;
            hasAsyncFunctions = false;
            hasDecorators = false;
            hasParameterDecorators = false;
        }
        return bindSourceFile;
        function createSymbol(flags, name) {
            symbolCount++;
            return new Symbol(flags, name);
        }
        function addDeclarationToSymbol(symbol, node, symbolFlags) {
            symbol.flags |= symbolFlags;
            node.symbol = symbol;
            if (!symbol.declarations) {
                symbol.declarations = [];
            }
            symbol.declarations.push(node);
            if (symbolFlags & 1952 /* HasExports */ && !symbol.exports) {
                symbol.exports = {};
            }
            if (symbolFlags & 6240 /* HasMembers */ && !symbol.members) {
                symbol.members = {};
            }
            if (symbolFlags & 107455 /* Value */) {
                var valueDeclaration = symbol.valueDeclaration;
                if (!valueDeclaration ||
                    (valueDeclaration.kind !== node.kind && valueDeclaration.kind === 221 /* ModuleDeclaration */)) {
                    // other kinds of value declarations take precedence over modules
                    symbol.valueDeclaration = node;
                }
            }
            // netbeanstypescript: check for @deprecated comments before the declaration
            var start = (node.kind === 214 /* VariableDeclaration */ ? node.parent : node).pos;
            if (file.text.substring(start, ts.skipTrivia(file.text, start)).indexOf("@deprecated") >= 0) {
                symbol.flags |= 2147483648 /* Deprecated */;
            }
        }
        // Should not be called on a declaration with a computed property name,
        // unless it is a well known Symbol.
        function getDeclarationName(node) {
            if (node.name) {
                if (ts.isAmbientModule(node)) {
                    return ts.isGlobalScopeAugmentation(node) ? "__global" : "\"" + node.name.text + "\"";
                }
                if (node.name.kind === 137 /* ComputedPropertyName */) {
                    var nameExpression = node.name.expression;
                    // treat computed property names where expression is string/numeric literal as just string/numeric literal
                    if (ts.isStringOrNumericLiteral(nameExpression.kind)) {
                        return nameExpression.text;
                    }
                    ts.Debug.assert(ts.isWellKnownSymbolSyntactically(nameExpression));
                    return ts.getPropertyNameForKnownSymbolName(nameExpression.name.text);
                }
                return node.name.text;
            }
            switch (node.kind) {
                case 145 /* Constructor */:
                    return "__constructor";
                case 153 /* FunctionType */:
                case 148 /* CallSignature */:
                    return "__call";
                case 154 /* ConstructorType */:
                case 149 /* ConstructSignature */:
                    return "__new";
                case 150 /* IndexSignature */:
                    return "__index";
                case 231 /* ExportDeclaration */:
                    return "__export";
                case 230 /* ExportAssignment */:
                    return node.isExportEquals ? "export=" : "default";
                case 184 /* BinaryExpression */:
                    switch (ts.getSpecialPropertyAssignmentKind(node)) {
                        case 2 /* ModuleExports */:
                            // module.exports = ...
                            return "export=";
                        case 1 /* ExportsProperty */:
                        case 4 /* ThisProperty */:
                            // exports.x = ... or this.y = ...
                            return node.left.name.text;
                        case 3 /* PrototypeProperty */:
                            // className.prototype.methodName = ...
                            return node.left.expression.name.text;
                    }
                    ts.Debug.fail("Unknown binary declaration kind");
                    break;
                case 216 /* FunctionDeclaration */:
                case 217 /* ClassDeclaration */:
                    return node.flags & 512 /* Default */ ? "default" : undefined;
                case 264 /* JSDocFunctionType */:
                    return ts.isJSDocConstructSignature(node) ? "__new" : "__call";
                case 139 /* Parameter */:
                    // Parameters with names are handled at the top of this function.  Parameters
                    // without names can only come from JSDocFunctionTypes.
                    ts.Debug.assert(node.parent.kind === 264 /* JSDocFunctionType */);
                    var functionType = node.parent;
                    var index = ts.indexOf(functionType.parameters, node);
                    return "p" + index;
            }
        }
        function getDisplayName(node) {
            return node.name ? ts.declarationNameToString(node.name) : getDeclarationName(node);
        }
        /**
         * Declares a Symbol for the node and adds it to symbols. Reports errors for conflicting identifier names.
         * @param symbolTable - The symbol table which node will be added to.
         * @param parent - node's parent declaration.
         * @param node - The declaration to be added to the symbol table
         * @param includes - The SymbolFlags that node has in addition to its declaration type (eg: export, ambient, etc.)
         * @param excludes - The flags which node cannot be declared alongside in a symbol table. Used to report forbidden declarations.
         */
        function declareSymbol(symbolTable, parent, node, includes, excludes) {
            ts.Debug.assert(!ts.hasDynamicName(node));
            var isDefaultExport = node.flags & 512 /* Default */;
            // The exported symbol for an export default function/class node is always named "default"
            var name = isDefaultExport && parent ? "default" : getDeclarationName(node);
            var symbol;
            if (name !== undefined) {
                // Check and see if the symbol table already has a symbol with this name.  If not,
                // create a new symbol with this name and add it to the table.  Note that we don't
                // give the new symbol any flags *yet*.  This ensures that it will not conflict
                // with the 'excludes' flags we pass in.
                //
                // If we do get an existing symbol, see if it conflicts with the new symbol we're
                // creating.  For example, a 'var' symbol and a 'class' symbol will conflict within
                // the same symbol table.  If we have a conflict, report the issue on each
                // declaration we have for this symbol, and then create a new symbol for this
                // declaration.
                //
                // If we created a new symbol, either because we didn't have a symbol with this name
                // in the symbol table, or we conflicted with an existing symbol, then just add this
                // node as the sole declaration of the new symbol.
                //
                // Otherwise, we'll be merging into a compatible existing symbol (for example when
                // you have multiple 'vars' with the same name in the same container).  In this case
                // just add this node into the declarations list of the symbol.
                symbol = ts.hasProperty(symbolTable, name)
                    ? symbolTable[name]
                    : (symbolTable[name] = createSymbol(0 /* None */, name));
                if (name && (includes & 788448 /* Classifiable */)) {
                    classifiableNames[name] = name;
                }
                if (symbol.flags & excludes) {
                    if (node.name) {
                        node.name.parent = node;
                    }
                    // Report errors every position with duplicate declaration
                    // Report errors on previous encountered declarations
                    var message_1 = symbol.flags & 2 /* BlockScopedVariable */
                        ? ts.Diagnostics.Cannot_redeclare_block_scoped_variable_0
                        : ts.Diagnostics.Duplicate_identifier_0;
                    ts.forEach(symbol.declarations, function (declaration) {
                        if (declaration.flags & 512 /* Default */) {
                            message_1 = ts.Diagnostics.A_module_cannot_have_multiple_default_exports;
                        }
                    });
                    ts.forEach(symbol.declarations, function (declaration) {
                        file.bindDiagnostics.push(ts.createDiagnosticForNode(declaration.name || declaration, message_1, getDisplayName(declaration)));
                    });
                    file.bindDiagnostics.push(ts.createDiagnosticForNode(node.name || node, message_1, getDisplayName(node)));
                    symbol = createSymbol(0 /* None */, name);
                }
            }
            else {
                symbol = createSymbol(0 /* None */, "__missing");
            }
            addDeclarationToSymbol(symbol, node, includes);
            symbol.parent = parent;
            return symbol;
        }
        function declareModuleMember(node, symbolFlags, symbolExcludes) {
            var hasExportModifier = ts.getCombinedNodeFlags(node) & 2 /* Export */;
            if (symbolFlags & 8388608 /* Alias */) {
                if (node.kind === 233 /* ExportSpecifier */ || (node.kind === 224 /* ImportEqualsDeclaration */ && hasExportModifier)) {
                    return declareSymbol(container.symbol.exports, container.symbol, node, symbolFlags, symbolExcludes);
                }
                else {
                    return declareSymbol(container.locals, undefined, node, symbolFlags, symbolExcludes);
                }
            }
            else {
                // Exported module members are given 2 symbols: A local symbol that is classified with an ExportValue,
                // ExportType, or ExportContainer flag, and an associated export symbol with all the correct flags set
                // on it. There are 2 main reasons:
                //
                //   1. We treat locals and exports of the same name as mutually exclusive within a container.
                //      That means the binder will issue a Duplicate Identifier error if you mix locals and exports
                //      with the same name in the same container.
                //      TODO: Make this a more specific error and decouple it from the exclusion logic.
                //   2. When we checkIdentifier in the checker, we set its resolved symbol to the local symbol,
                //      but return the export symbol (by calling getExportSymbolOfValueSymbolIfExported). That way
                //      when the emitter comes back to it, it knows not to qualify the name if it was found in a containing scope.
                // NOTE: Nested ambient modules always should go to to 'locals' table to prevent their automatic merge
                //       during global merging in the checker. Why? The only case when ambient module is permitted inside another module is module augmentation
                //       and this case is specially handled. Module augmentations should only be merged with original module definition
                //       and should never be merged directly with other augmentation, and the latter case would be possible if automatic merge is allowed.
                if (!ts.isAmbientModule(node) && (hasExportModifier || container.flags & 131072 /* ExportContext */)) {
                    var exportKind = (symbolFlags & 107455 /* Value */ ? 1048576 /* ExportValue */ : 0) |
                        (symbolFlags & 793056 /* Type */ ? 2097152 /* ExportType */ : 0) |
                        (symbolFlags & 1536 /* Namespace */ ? 4194304 /* ExportNamespace */ : 0);
                    var local = declareSymbol(container.locals, undefined, node, exportKind, symbolExcludes);
                    local.exportSymbol = declareSymbol(container.symbol.exports, container.symbol, node, symbolFlags, symbolExcludes);
                    node.localSymbol = local;
                    return local;
                }
                else {
                    return declareSymbol(container.locals, undefined, node, symbolFlags, symbolExcludes);
                }
            }
        }
        // All container nodes are kept on a linked list in declaration order. This list is used by
        // the getLocalNameOfContainer function in the type checker to validate that the local name
        // used for a container is unique.
        function bindChildren(node) {
            // Before we recurse into a node's chilren, we first save the existing parent, container
            // and block-container.  Then after we pop out of processing the children, we restore
            // these saved values.
            var saveParent = parent;
            var saveContainer = container;
            var savedBlockScopeContainer = blockScopeContainer;
            // This node will now be set as the parent of all of its children as we recurse into them.
            parent = node;
            // Depending on what kind of node this is, we may have to adjust the current container
            // and block-container.   If the current node is a container, then it is automatically
            // considered the current block-container as well.  Also, for containers that we know
            // may contain locals, we proactively initialize the .locals field. We do this because
            // it's highly likely that the .locals will be needed to place some child in (for example,
            // a parameter, or variable declaration).
            //
            // However, we do not proactively create the .locals for block-containers because it's
            // totally normal and common for block-containers to never actually have a block-scoped
            // variable in them.  We don't want to end up allocating an object for every 'block' we
            // run into when most of them won't be necessary.
            //
            // Finally, if this is a block-container, then we clear out any existing .locals object
            // it may contain within it.  This happens in incremental scenarios.  Because we can be
            // reusing a node from a previous compilation, that node may have had 'locals' created
            // for it.  We must clear this so we don't accidently move any stale data forward from
            // a previous compilation.
            var containerFlags = getContainerFlags(node);
            if (containerFlags & 1 /* IsContainer */) {
                container = blockScopeContainer = node;
                if (containerFlags & 4 /* HasLocals */) {
                    container.locals = {};
                }
                addToContainerChain(container);
            }
            else if (containerFlags & 2 /* IsBlockScopedContainer */) {
                blockScopeContainer = node;
                blockScopeContainer.locals = undefined;
            }
            var savedReachabilityState;
            var savedLabelStack;
            var savedLabels;
            var savedImplicitLabels;
            var savedHasExplicitReturn;
            var kind = node.kind;
            var flags = node.flags;
            // reset all reachability check related flags on node (for incremental scenarios)
            flags &= ~1572864 /* ReachabilityCheckFlags */;
            // reset all emit helper flags on node (for incremental scenarios)
            flags &= ~62914560 /* EmitHelperFlags */;
            if (kind === 218 /* InterfaceDeclaration */) {
                seenThisKeyword = false;
            }
            var saveState = kind === 251 /* SourceFile */ || kind === 222 /* ModuleBlock */ || ts.isFunctionLikeKind(kind);
            if (saveState) {
                savedReachabilityState = currentReachabilityState;
                savedLabelStack = labelStack;
                savedLabels = labelIndexMap;
                savedImplicitLabels = implicitLabels;
                savedHasExplicitReturn = hasExplicitReturn;
                currentReachabilityState = 2 /* Reachable */;
                hasExplicitReturn = false;
                labelStack = labelIndexMap = implicitLabels = undefined;
            }
            if (ts.isInJavaScriptFile(node) && node.jsDocComment) {
                bind(node.jsDocComment);
            }
            bindReachableStatement(node);
            if (currentReachabilityState === 2 /* Reachable */ && ts.isFunctionLikeKind(kind) && ts.nodeIsPresent(node.body)) {
                flags |= 524288 /* HasImplicitReturn */;
                if (hasExplicitReturn) {
                    flags |= 1048576 /* HasExplicitReturn */;
                }
            }
            if (kind === 218 /* InterfaceDeclaration */) {
                flags = seenThisKeyword ? flags | 262144 /* ContainsThis */ : flags & ~262144 /* ContainsThis */;
            }
            if (kind === 251 /* SourceFile */) {
                if (hasClassExtends) {
                    flags |= 4194304 /* HasClassExtends */;
                }
                if (hasDecorators) {
                    flags |= 8388608 /* HasDecorators */;
                }
                if (hasParameterDecorators) {
                    flags |= 16777216 /* HasParamDecorators */;
                }
                if (hasAsyncFunctions) {
                    flags |= 33554432 /* HasAsyncFunctions */;
                }
            }
            node.flags = flags;
            if (saveState) {
                hasExplicitReturn = savedHasExplicitReturn;
                currentReachabilityState = savedReachabilityState;
                labelStack = savedLabelStack;
                labelIndexMap = savedLabels;
                implicitLabels = savedImplicitLabels;
            }
            container = saveContainer;
            parent = saveParent;
            blockScopeContainer = savedBlockScopeContainer;
        }
        /**
         * Returns true if node and its subnodes were successfully traversed.
         * Returning false means that node was not examined and caller needs to dive into the node himself.
         */
        function bindReachableStatement(node) {
            if (checkUnreachable(node)) {
                ts.forEachChild(node, bind);
                return;
            }
            switch (node.kind) {
                case 201 /* WhileStatement */:
                    bindWhileStatement(node);
                    break;
                case 200 /* DoStatement */:
                    bindDoStatement(node);
                    break;
                case 202 /* ForStatement */:
                    bindForStatement(node);
                    break;
                case 203 /* ForInStatement */:
                case 204 /* ForOfStatement */:
                    bindForInOrForOfStatement(node);
                    break;
                case 199 /* IfStatement */:
                    bindIfStatement(node);
                    break;
                case 207 /* ReturnStatement */:
                case 211 /* ThrowStatement */:
                    bindReturnOrThrow(node);
                    break;
                case 206 /* BreakStatement */:
                case 205 /* ContinueStatement */:
                    bindBreakOrContinueStatement(node);
                    break;
                case 212 /* TryStatement */:
                    bindTryStatement(node);
                    break;
                case 209 /* SwitchStatement */:
                    bindSwitchStatement(node);
                    break;
                case 223 /* CaseBlock */:
                    bindCaseBlock(node);
                    break;
                case 210 /* LabeledStatement */:
                    bindLabeledStatement(node);
                    break;
                default:
                    ts.forEachChild(node, bind);
                    break;
            }
        }
        function bindWhileStatement(n) {
            var preWhileState = n.expression.kind === 84 /* FalseKeyword */ ? 4 /* Unreachable */ : currentReachabilityState;
            var postWhileState = n.expression.kind === 99 /* TrueKeyword */ ? 4 /* Unreachable */ : currentReachabilityState;
            // bind expressions (don't affect reachability)
            bind(n.expression);
            currentReachabilityState = preWhileState;
            var postWhileLabel = pushImplicitLabel();
            bind(n.statement);
            popImplicitLabel(postWhileLabel, postWhileState);
        }
        function bindDoStatement(n) {
            var preDoState = currentReachabilityState;
            var postDoLabel = pushImplicitLabel();
            bind(n.statement);
            var postDoState = n.expression.kind === 99 /* TrueKeyword */ ? 4 /* Unreachable */ : preDoState;
            popImplicitLabel(postDoLabel, postDoState);
            // bind expressions (don't affect reachability)
            bind(n.expression);
        }
        function bindForStatement(n) {
            var preForState = currentReachabilityState;
            var postForLabel = pushImplicitLabel();
            // bind expressions (don't affect reachability)
            bind(n.initializer);
            bind(n.condition);
            bind(n.incrementor);
            bind(n.statement);
            // for statement is considered infinite when it condition is either omitted or is true keyword
            // - for(..;;..)
            // - for(..;true;..)
            var isInfiniteLoop = (!n.condition || n.condition.kind === 99 /* TrueKeyword */);
            var postForState = isInfiniteLoop ? 4 /* Unreachable */ : preForState;
            popImplicitLabel(postForLabel, postForState);
        }
        function bindForInOrForOfStatement(n) {
            var preStatementState = currentReachabilityState;
            var postStatementLabel = pushImplicitLabel();
            // bind expressions (don't affect reachability)
            bind(n.initializer);
            bind(n.expression);
            bind(n.statement);
            popImplicitLabel(postStatementLabel, preStatementState);
        }
        function bindIfStatement(n) {
            // denotes reachability state when entering 'thenStatement' part of the if statement:
            // i.e. if condition is false then thenStatement is unreachable
            var ifTrueState = n.expression.kind === 84 /* FalseKeyword */ ? 4 /* Unreachable */ : currentReachabilityState;
            // denotes reachability state when entering 'elseStatement':
            // i.e. if condition is true then elseStatement is unreachable
            var ifFalseState = n.expression.kind === 99 /* TrueKeyword */ ? 4 /* Unreachable */ : currentReachabilityState;
            currentReachabilityState = ifTrueState;
            // bind expression (don't affect reachability)
            bind(n.expression);
            bind(n.thenStatement);
            if (n.elseStatement) {
                var preElseState = currentReachabilityState;
                currentReachabilityState = ifFalseState;
                bind(n.elseStatement);
                currentReachabilityState = or(currentReachabilityState, preElseState);
            }
            else {
                currentReachabilityState = or(currentReachabilityState, ifFalseState);
            }
        }
        function bindReturnOrThrow(n) {
            // bind expression (don't affect reachability)
            bind(n.expression);
            if (n.kind === 207 /* ReturnStatement */) {
                hasExplicitReturn = true;
            }
            currentReachabilityState = 4 /* Unreachable */;
        }
        function bindBreakOrContinueStatement(n) {
            // call bind on label (don't affect reachability)
            bind(n.label);
            // for continue case touch label so it will be marked a used
            var isValidJump = jumpToLabel(n.label, n.kind === 206 /* BreakStatement */ ? currentReachabilityState : 4 /* Unreachable */);
            if (isValidJump) {
                currentReachabilityState = 4 /* Unreachable */;
            }
        }
        function bindTryStatement(n) {
            // catch\finally blocks has the same reachability as try block
            var preTryState = currentReachabilityState;
            bind(n.tryBlock);
            var postTryState = currentReachabilityState;
            currentReachabilityState = preTryState;
            bind(n.catchClause);
            var postCatchState = currentReachabilityState;
            currentReachabilityState = preTryState;
            bind(n.finallyBlock);
            // post catch/finally state is reachable if
            // - post try state is reachable - control flow can fall out of try block
            // - post catch state is reachable - control flow can fall out of catch block
            currentReachabilityState = or(postTryState, postCatchState);
        }
        function bindSwitchStatement(n) {
            var preSwitchState = currentReachabilityState;
            var postSwitchLabel = pushImplicitLabel();
            // bind expression (don't affect reachability)
            bind(n.expression);
            bind(n.caseBlock);
            var hasDefault = ts.forEach(n.caseBlock.clauses, function (c) { return c.kind === 245 /* DefaultClause */; });
            // post switch state is unreachable if switch is exaustive (has a default case ) and does not have fallthrough from the last case
            var postSwitchState = hasDefault && currentReachabilityState !== 2 /* Reachable */ ? 4 /* Unreachable */ : preSwitchState;
            popImplicitLabel(postSwitchLabel, postSwitchState);
        }
        function bindCaseBlock(n) {
            var startState = currentReachabilityState;
            for (var _i = 0, _a = n.clauses; _i < _a.length; _i++) {
                var clause = _a[_i];
                currentReachabilityState = startState;
                bind(clause);
                if (clause.statements.length && currentReachabilityState === 2 /* Reachable */ && options.noFallthroughCasesInSwitch) {
                    errorOnFirstToken(clause, ts.Diagnostics.Fallthrough_case_in_switch);
                }
            }
        }
        function bindLabeledStatement(n) {
            // call bind on label (don't affect reachability)
            bind(n.label);
            var ok = pushNamedLabel(n.label);
            bind(n.statement);
            if (ok) {
                popNamedLabel(n.label, currentReachabilityState);
            }
        }
        function getContainerFlags(node) {
            switch (node.kind) {
                case 189 /* ClassExpression */:
                case 217 /* ClassDeclaration */:
                case 218 /* InterfaceDeclaration */:
                case 220 /* EnumDeclaration */:
                case 168 /* ObjectLiteralExpression */:
                case 156 /* TypeLiteral */:
                case 260 /* JSDocRecordType */:
                    return 1 /* IsContainer */;
                case 148 /* CallSignature */:
                case 149 /* ConstructSignature */:
                case 150 /* IndexSignature */:
                case 144 /* MethodDeclaration */:
                case 143 /* MethodSignature */:
                case 216 /* FunctionDeclaration */:
                case 145 /* Constructor */:
                case 146 /* GetAccessor */:
                case 147 /* SetAccessor */:
                case 153 /* FunctionType */:
                case 154 /* ConstructorType */:
                case 176 /* FunctionExpression */:
                case 177 /* ArrowFunction */:
                case 221 /* ModuleDeclaration */:
                case 251 /* SourceFile */:
                case 219 /* TypeAliasDeclaration */:
                    return 5 /* IsContainerWithLocals */;
                case 247 /* CatchClause */:
                case 202 /* ForStatement */:
                case 203 /* ForInStatement */:
                case 204 /* ForOfStatement */:
                case 223 /* CaseBlock */:
                    return 2 /* IsBlockScopedContainer */;
                case 195 /* Block */:
                    // do not treat blocks directly inside a function as a block-scoped-container.
                    // Locals that reside in this block should go to the function locals. Othewise 'x'
                    // would not appear to be a redeclaration of a block scoped local in the following
                    // example:
                    //
                    //      function foo() {
                    //          var x;
                    //          let x;
                    //      }
                    //
                    // If we placed 'var x' into the function locals and 'let x' into the locals of
                    // the block, then there would be no collision.
                    //
                    // By not creating a new block-scoped-container here, we ensure that both 'var x'
                    // and 'let x' go into the Function-container's locals, and we do get a collision
                    // conflict.
                    return ts.isFunctionLike(node.parent) ? 0 /* None */ : 2 /* IsBlockScopedContainer */;
            }
            return 0 /* None */;
        }
        function addToContainerChain(next) {
            if (lastContainer) {
                lastContainer.nextContainer = next;
            }
            lastContainer = next;
        }
        function declareSymbolAndAddToSymbolTable(node, symbolFlags, symbolExcludes) {
            // Just call this directly so that the return type of this function stays "void".
            declareSymbolAndAddToSymbolTableWorker(node, symbolFlags, symbolExcludes);
        }
        function declareSymbolAndAddToSymbolTableWorker(node, symbolFlags, symbolExcludes) {
            switch (container.kind) {
                // Modules, source files, and classes need specialized handling for how their
                // members are declared (for example, a member of a class will go into a specific
                // symbol table depending on if it is static or not). We defer to specialized
                // handlers to take care of declaring these child members.
                case 221 /* ModuleDeclaration */:
                    return declareModuleMember(node, symbolFlags, symbolExcludes);
                case 251 /* SourceFile */:
                    return declareSourceFileMember(node, symbolFlags, symbolExcludes);
                case 189 /* ClassExpression */:
                case 217 /* ClassDeclaration */:
                    return declareClassMember(node, symbolFlags, symbolExcludes);
                case 220 /* EnumDeclaration */:
                    return declareSymbol(container.symbol.exports, container.symbol, node, symbolFlags, symbolExcludes);
                case 156 /* TypeLiteral */:
                case 168 /* ObjectLiteralExpression */:
                case 218 /* InterfaceDeclaration */:
                case 260 /* JSDocRecordType */:
                    // Interface/Object-types always have their children added to the 'members' of
                    // their container. They are only accessible through an instance of their
                    // container, and are never in scope otherwise (even inside the body of the
                    // object / type / interface declaring them). An exception is type parameters,
                    // which are in scope without qualification (similar to 'locals').
                    return declareSymbol(container.symbol.members, container.symbol, node, symbolFlags, symbolExcludes);
                case 153 /* FunctionType */:
                case 154 /* ConstructorType */:
                case 148 /* CallSignature */:
                case 149 /* ConstructSignature */:
                case 150 /* IndexSignature */:
                case 144 /* MethodDeclaration */:
                case 143 /* MethodSignature */:
                case 145 /* Constructor */:
                case 146 /* GetAccessor */:
                case 147 /* SetAccessor */:
                case 216 /* FunctionDeclaration */:
                case 176 /* FunctionExpression */:
                case 177 /* ArrowFunction */:
                case 264 /* JSDocFunctionType */:
                case 219 /* TypeAliasDeclaration */:
                    // All the children of these container types are never visible through another
                    // symbol (i.e. through another symbol's 'exports' or 'members').  Instead,
                    // they're only accessed 'lexically' (i.e. from code that exists underneath
                    // their container in the tree.  To accomplish this, we simply add their declared
                    // symbol to the 'locals' of the container.  These symbols can then be found as
                    // the type checker walks up the containers, checking them for matching names.
                    return declareSymbol(container.locals, undefined, node, symbolFlags, symbolExcludes);
            }
        }
        function declareClassMember(node, symbolFlags, symbolExcludes) {
            return node.flags & 64 /* Static */
                ? declareSymbol(container.symbol.exports, container.symbol, node, symbolFlags, symbolExcludes)
                : declareSymbol(container.symbol.members, container.symbol, node, symbolFlags, symbolExcludes);
        }
        function declareSourceFileMember(node, symbolFlags, symbolExcludes) {
            return ts.isExternalModule(file)
                ? declareModuleMember(node, symbolFlags, symbolExcludes)
                : declareSymbol(file.locals, undefined, node, symbolFlags, symbolExcludes);
        }
        function hasExportDeclarations(node) {
            var body = node.kind === 251 /* SourceFile */ ? node : node.body;
            if (body.kind === 251 /* SourceFile */ || body.kind === 222 /* ModuleBlock */) {
                for (var _i = 0, _a = body.statements; _i < _a.length; _i++) {
                    var stat = _a[_i];
                    if (stat.kind === 231 /* ExportDeclaration */ || stat.kind === 230 /* ExportAssignment */) {
                        return true;
                    }
                }
            }
            return false;
        }
        function setExportContextFlag(node) {
            // A declaration source file or ambient module declaration that contains no export declarations (but possibly regular
            // declarations with export modifiers) is an export context in which declarations are implicitly exported.
            if (ts.isInAmbientContext(node) && !hasExportDeclarations(node)) {
                node.flags |= 131072 /* ExportContext */;
            }
            else {
                node.flags &= ~131072 /* ExportContext */;
            }
        }
        function bindModuleDeclaration(node) {
            setExportContextFlag(node);
            if (ts.isAmbientModule(node)) {
                if (node.flags & 2 /* Export */) {
                    errorOnFirstToken(node, ts.Diagnostics.export_modifier_cannot_be_applied_to_ambient_modules_and_module_augmentations_since_they_are_always_visible);
                }
                declareSymbolAndAddToSymbolTable(node, 512 /* ValueModule */, 106639 /* ValueModuleExcludes */);
            }
            else {
                var state = getModuleInstanceState(node);
                if (state === 0 /* NonInstantiated */) {
                    declareSymbolAndAddToSymbolTable(node, 1024 /* NamespaceModule */, 0 /* NamespaceModuleExcludes */);
                }
                else {
                    declareSymbolAndAddToSymbolTable(node, 512 /* ValueModule */, 106639 /* ValueModuleExcludes */);
                    if (node.symbol.flags & (16 /* Function */ | 32 /* Class */ | 256 /* RegularEnum */)) {
                        // if module was already merged with some function, class or non-const enum
                        // treat is a non-const-enum-only
                        node.symbol.constEnumOnlyModule = false;
                    }
                    else {
                        var currentModuleIsConstEnumOnly = state === 2 /* ConstEnumOnly */;
                        if (node.symbol.constEnumOnlyModule === undefined) {
                            // non-merged case - use the current state
                            node.symbol.constEnumOnlyModule = currentModuleIsConstEnumOnly;
                        }
                        else {
                            // merged case: module is const enum only if all its pieces are non-instantiated or const enum
                            node.symbol.constEnumOnlyModule = node.symbol.constEnumOnlyModule && currentModuleIsConstEnumOnly;
                        }
                    }
                }
            }
        }
        function bindFunctionOrConstructorType(node) {
            // For a given function symbol "<...>(...) => T" we want to generate a symbol identical
            // to the one we would get for: { <...>(...): T }
            //
            // We do that by making an anonymous type literal symbol, and then setting the function
            // symbol as its sole member. To the rest of the system, this symbol will be  indistinguishable
            // from an actual type literal symbol you would have gotten had you used the long form.
            var symbol = createSymbol(131072 /* Signature */, getDeclarationName(node));
            addDeclarationToSymbol(symbol, node, 131072 /* Signature */);
            var typeLiteralSymbol = createSymbol(2048 /* TypeLiteral */, "__type");
            addDeclarationToSymbol(typeLiteralSymbol, node, 2048 /* TypeLiteral */);
            typeLiteralSymbol.members = (_a = {}, _a[symbol.name] = symbol, _a);
            var _a;
        }
        function bindObjectLiteralExpression(node) {
            if (inStrictMode) {
                var seen = {};
                for (var _i = 0, _a = node.properties; _i < _a.length; _i++) {
                    var prop = _a[_i];
                    if (prop.name.kind !== 69 /* Identifier */) {
                        continue;
                    }
                    var identifier = prop.name;
                    // ECMA-262 11.1.5 Object Initialiser
                    // If previous is not undefined then throw a SyntaxError exception if any of the following conditions are true
                    // a.This production is contained in strict code and IsDataDescriptor(previous) is true and
                    // IsDataDescriptor(propId.descriptor) is true.
                    //    b.IsDataDescriptor(previous) is true and IsAccessorDescriptor(propId.descriptor) is true.
                    //    c.IsAccessorDescriptor(previous) is true and IsDataDescriptor(propId.descriptor) is true.
                    //    d.IsAccessorDescriptor(previous) is true and IsAccessorDescriptor(propId.descriptor) is true
                    // and either both previous and propId.descriptor have[[Get]] fields or both previous and propId.descriptor have[[Set]] fields
                    var currentKind = prop.kind === 248 /* PropertyAssignment */ || prop.kind === 249 /* ShorthandPropertyAssignment */ || prop.kind === 144 /* MethodDeclaration */
                        ? 1 /* Property */
                        : 2 /* Accessor */;
                    var existingKind = seen[identifier.text];
                    if (!existingKind) {
                        seen[identifier.text] = currentKind;
                        continue;
                    }
                    if (currentKind === 1 /* Property */ && existingKind === 1 /* Property */) {
                        var span = ts.getErrorSpanForNode(file, identifier);
                        file.bindDiagnostics.push(ts.createFileDiagnostic(file, span.start, span.length, ts.Diagnostics.An_object_literal_cannot_have_multiple_properties_with_the_same_name_in_strict_mode));
                    }
                }
            }
            return bindAnonymousDeclaration(node, 4096 /* ObjectLiteral */, "__object");
        }
        function bindAnonymousDeclaration(node, symbolFlags, name) {
            var symbol = createSymbol(symbolFlags, name);
            addDeclarationToSymbol(symbol, node, symbolFlags);
        }
        function bindBlockScopedDeclaration(node, symbolFlags, symbolExcludes) {
            switch (blockScopeContainer.kind) {
                case 221 /* ModuleDeclaration */:
                    declareModuleMember(node, symbolFlags, symbolExcludes);
                    break;
                case 251 /* SourceFile */:
                    if (ts.isExternalModule(container)) {
                        declareModuleMember(node, symbolFlags, symbolExcludes);
                        break;
                    }
                // fall through.
                default:
                    if (!blockScopeContainer.locals) {
                        blockScopeContainer.locals = {};
                        addToContainerChain(blockScopeContainer);
                    }
                    declareSymbol(blockScopeContainer.locals, undefined, node, symbolFlags, symbolExcludes);
            }
        }
        function bindBlockScopedVariableDeclaration(node) {
            bindBlockScopedDeclaration(node, 2 /* BlockScopedVariable */, 107455 /* BlockScopedVariableExcludes */);
        }
        // The binder visits every node in the syntax tree so it is a convenient place to perform a single localized
        // check for reserved words used as identifiers in strict mode code.
        function checkStrictModeIdentifier(node) {
            if (inStrictMode &&
                node.originalKeywordKind >= 106 /* FirstFutureReservedWord */ &&
                node.originalKeywordKind <= 114 /* LastFutureReservedWord */ &&
                !ts.isIdentifierName(node)) {
                // Report error only if there are no parse errors in file
                if (!file.parseDiagnostics.length) {
                    file.bindDiagnostics.push(ts.createDiagnosticForNode(node, getStrictModeIdentifierMessage(node), ts.declarationNameToString(node)));
                }
            }
        }
        function getStrictModeIdentifierMessage(node) {
            // Provide specialized messages to help the user understand why we think they're in
            // strict mode.
            if (ts.getContainingClass(node)) {
                return ts.Diagnostics.Identifier_expected_0_is_a_reserved_word_in_strict_mode_Class_definitions_are_automatically_in_strict_mode;
            }
            if (file.externalModuleIndicator) {
                return ts.Diagnostics.Identifier_expected_0_is_a_reserved_word_in_strict_mode_Modules_are_automatically_in_strict_mode;
            }
            return ts.Diagnostics.Identifier_expected_0_is_a_reserved_word_in_strict_mode;
        }
        function checkStrictModeBinaryExpression(node) {
            if (inStrictMode && ts.isLeftHandSideExpression(node.left) && ts.isAssignmentOperator(node.operatorToken.kind)) {
                // ECMA 262 (Annex C) The identifier eval or arguments may not appear as the LeftHandSideExpression of an
                // Assignment operator(11.13) or of a PostfixExpression(11.3)
                checkStrictModeEvalOrArguments(node, node.left);
            }
        }
        function checkStrictModeCatchClause(node) {
            // It is a SyntaxError if a TryStatement with a Catch occurs within strict code and the Identifier of the
            // Catch production is eval or arguments
            if (inStrictMode && node.variableDeclaration) {
                checkStrictModeEvalOrArguments(node, node.variableDeclaration.name);
            }
        }
        function checkStrictModeDeleteExpression(node) {
            // Grammar checking
            if (inStrictMode && node.expression.kind === 69 /* Identifier */) {
                // When a delete operator occurs within strict mode code, a SyntaxError is thrown if its
                // UnaryExpression is a direct reference to a variable, function argument, or function name
                var span = ts.getErrorSpanForNode(file, node.expression);
                file.bindDiagnostics.push(ts.createFileDiagnostic(file, span.start, span.length, ts.Diagnostics.delete_cannot_be_called_on_an_identifier_in_strict_mode));
            }
        }
        function isEvalOrArgumentsIdentifier(node) {
            return node.kind === 69 /* Identifier */ &&
                (node.text === "eval" || node.text === "arguments");
        }
        function checkStrictModeEvalOrArguments(contextNode, name) {
            if (name && name.kind === 69 /* Identifier */) {
                var identifier = name;
                if (isEvalOrArgumentsIdentifier(identifier)) {
                    // We check first if the name is inside class declaration or class expression; if so give explicit message
                    // otherwise report generic error message.
                    var span = ts.getErrorSpanForNode(file, name);
                    file.bindDiagnostics.push(ts.createFileDiagnostic(file, span.start, span.length, getStrictModeEvalOrArgumentsMessage(contextNode), identifier.text));
                }
            }
        }
        function getStrictModeEvalOrArgumentsMessage(node) {
            // Provide specialized messages to help the user understand why we think they're in
            // strict mode.
            if (ts.getContainingClass(node)) {
                return ts.Diagnostics.Invalid_use_of_0_Class_definitions_are_automatically_in_strict_mode;
            }
            if (file.externalModuleIndicator) {
                return ts.Diagnostics.Invalid_use_of_0_Modules_are_automatically_in_strict_mode;
            }
            return ts.Diagnostics.Invalid_use_of_0_in_strict_mode;
        }
        function checkStrictModeFunctionName(node) {
            if (inStrictMode) {
                // It is a SyntaxError if the identifier eval or arguments appears within a FormalParameterList of a strict mode FunctionDeclaration or FunctionExpression (13.1))
                checkStrictModeEvalOrArguments(node, node.name);
            }
        }
        function checkStrictModeNumericLiteral(node) {
            if (inStrictMode && node.flags & 32768 /* OctalLiteral */) {
                file.bindDiagnostics.push(ts.createDiagnosticForNode(node, ts.Diagnostics.Octal_literals_are_not_allowed_in_strict_mode));
            }
        }
        function checkStrictModePostfixUnaryExpression(node) {
            // Grammar checking
            // The identifier eval or arguments may not appear as the LeftHandSideExpression of an
            // Assignment operator(11.13) or of a PostfixExpression(11.3) or as the UnaryExpression
            // operated upon by a Prefix Increment(11.4.4) or a Prefix Decrement(11.4.5) operator.
            if (inStrictMode) {
                checkStrictModeEvalOrArguments(node, node.operand);
            }
        }
        function checkStrictModePrefixUnaryExpression(node) {
            // Grammar checking
            if (inStrictMode) {
                if (node.operator === 41 /* PlusPlusToken */ || node.operator === 42 /* MinusMinusToken */) {
                    checkStrictModeEvalOrArguments(node, node.operand);
                }
            }
        }
        function checkStrictModeWithStatement(node) {
            // Grammar checking for withStatement
            if (inStrictMode) {
                errorOnFirstToken(node, ts.Diagnostics.with_statements_are_not_allowed_in_strict_mode);
            }
        }
        function errorOnFirstToken(node, message, arg0, arg1, arg2) {
            var span = ts.getSpanOfTokenAtPosition(file, node.pos);
            file.bindDiagnostics.push(ts.createFileDiagnostic(file, span.start, span.length, message, arg0, arg1, arg2));
        }
        function getDestructuringParameterName(node) {
            return "__" + ts.indexOf(node.parent.parameters, node);
        }
        function bind(node) {
            if (!node) {
                return;
            }
            node.parent = parent;
            var savedInStrictMode = inStrictMode;
            if (!savedInStrictMode) {
                updateStrictMode(node);
            }
            // First we bind declaration nodes to a symbol if possible.  We'll both create a symbol
            // and then potentially add the symbol to an appropriate symbol table. Possible
            // destination symbol tables are:
            //
            //  1) The 'exports' table of the current container's symbol.
            //  2) The 'members' table of the current container's symbol.
            //  3) The 'locals' table of the current container.
            //
            // However, not all symbols will end up in any of these tables.  'Anonymous' symbols
            // (like TypeLiterals for example) will not be put in any table.
            bindWorker(node);
            // Then we recurse into the children of the node to bind them as well.  For certain
            // symbols we do specialized work when we recurse.  For example, we'll keep track of
            // the current 'container' node when it changes.  This helps us know which symbol table
            // a local should go into for example.
            bindChildren(node);
            inStrictMode = savedInStrictMode;
        }
        function updateStrictMode(node) {
            switch (node.kind) {
                case 251 /* SourceFile */:
                case 222 /* ModuleBlock */:
                    updateStrictModeStatementList(node.statements);
                    return;
                case 195 /* Block */:
                    if (ts.isFunctionLike(node.parent)) {
                        updateStrictModeStatementList(node.statements);
                    }
                    return;
                case 217 /* ClassDeclaration */:
                case 189 /* ClassExpression */:
                    // All classes are automatically in strict mode in ES6.
                    inStrictMode = true;
                    return;
            }
        }
        function updateStrictModeStatementList(statements) {
            for (var _i = 0, statements_1 = statements; _i < statements_1.length; _i++) {
                var statement = statements_1[_i];
                if (!ts.isPrologueDirective(statement)) {
                    return;
                }
                if (isUseStrictPrologueDirective(statement)) {
                    inStrictMode = true;
                    return;
                }
            }
        }
        /// Should be called only on prologue directives (isPrologueDirective(node) should be true)
        function isUseStrictPrologueDirective(node) {
            var nodeText = ts.getTextOfNodeFromSourceText(file.text, node.expression);
            // Note: the node text must be exactly "use strict" or 'use strict'.  It is not ok for the
            // string to contain unicode escapes (as per ES5).
            return nodeText === "\"use strict\"" || nodeText === "'use strict'";
        }
        function bindWorker(node) {
            switch (node.kind) {
                /* Strict mode checks */
                case 69 /* Identifier */:
                    return checkStrictModeIdentifier(node);
                case 184 /* BinaryExpression */:
                    if (ts.isInJavaScriptFile(node)) {
                        var specialKind = ts.getSpecialPropertyAssignmentKind(node);
                        switch (specialKind) {
                            case 1 /* ExportsProperty */:
                                bindExportsPropertyAssignment(node);
                                break;
                            case 2 /* ModuleExports */:
                                bindModuleExportsAssignment(node);
                                break;
                            case 3 /* PrototypeProperty */:
                                bindPrototypePropertyAssignment(node);
                                break;
                            case 4 /* ThisProperty */:
                                bindThisPropertyAssignment(node);
                                break;
                            case 0 /* None */:
                                // Nothing to do
                                break;
                            default:
                                ts.Debug.fail("Unknown special property assignment kind");
                        }
                    }
                    return checkStrictModeBinaryExpression(node);
                case 247 /* CatchClause */:
                    return checkStrictModeCatchClause(node);
                case 178 /* DeleteExpression */:
                    return checkStrictModeDeleteExpression(node);
                case 8 /* NumericLiteral */:
                    return checkStrictModeNumericLiteral(node);
                case 183 /* PostfixUnaryExpression */:
                    return checkStrictModePostfixUnaryExpression(node);
                case 182 /* PrefixUnaryExpression */:
                    return checkStrictModePrefixUnaryExpression(node);
                case 208 /* WithStatement */:
                    return checkStrictModeWithStatement(node);
                case 162 /* ThisType */:
                    seenThisKeyword = true;
                    return;
                case 151 /* TypePredicate */:
                    return checkTypePredicate(node);
                case 138 /* TypeParameter */:
                    return declareSymbolAndAddToSymbolTable(node, 262144 /* TypeParameter */, 530912 /* TypeParameterExcludes */);
                case 139 /* Parameter */:
                    return bindParameter(node);
                case 214 /* VariableDeclaration */:
                case 166 /* BindingElement */:
                    return bindVariableDeclarationOrBindingElement(node);
                case 142 /* PropertyDeclaration */:
                case 141 /* PropertySignature */:
                case 261 /* JSDocRecordMember */:
                    return bindPropertyOrMethodOrAccessor(node, 4 /* Property */ | (node.questionToken ? 536870912 /* Optional */ : 0 /* None */), 107455 /* PropertyExcludes */);
                case 248 /* PropertyAssignment */:
                case 249 /* ShorthandPropertyAssignment */:
                    return bindPropertyOrMethodOrAccessor(node, 4 /* Property */, 107455 /* PropertyExcludes */);
                case 250 /* EnumMember */:
                    return bindPropertyOrMethodOrAccessor(node, 8 /* EnumMember */, 107455 /* EnumMemberExcludes */);
                case 148 /* CallSignature */:
                case 149 /* ConstructSignature */:
                case 150 /* IndexSignature */:
                    return declareSymbolAndAddToSymbolTable(node, 131072 /* Signature */, 0 /* None */);
                case 144 /* MethodDeclaration */:
                case 143 /* MethodSignature */:
                    // If this is an ObjectLiteralExpression method, then it sits in the same space
                    // as other properties in the object literal.  So we use SymbolFlags.PropertyExcludes
                    // so that it will conflict with any other object literal members with the same
                    // name.
                    return bindPropertyOrMethodOrAccessor(node, 8192 /* Method */ | (node.questionToken ? 536870912 /* Optional */ : 0 /* None */), ts.isObjectLiteralMethod(node) ? 107455 /* PropertyExcludes */ : 99263 /* MethodExcludes */);
                case 216 /* FunctionDeclaration */:
                    return bindFunctionDeclaration(node);
                case 145 /* Constructor */:
                    return declareSymbolAndAddToSymbolTable(node, 16384 /* Constructor */, /*symbolExcludes:*/ 0 /* None */);
                case 146 /* GetAccessor */:
                    return bindPropertyOrMethodOrAccessor(node, 32768 /* GetAccessor */, 41919 /* GetAccessorExcludes */);
                case 147 /* SetAccessor */:
                    return bindPropertyOrMethodOrAccessor(node, 65536 /* SetAccessor */, 74687 /* SetAccessorExcludes */);
                case 153 /* FunctionType */:
                case 154 /* ConstructorType */:
                case 264 /* JSDocFunctionType */:
                    return bindFunctionOrConstructorType(node);
                case 156 /* TypeLiteral */:
                case 260 /* JSDocRecordType */:
                    return bindAnonymousDeclaration(node, 2048 /* TypeLiteral */, "__type");
                case 168 /* ObjectLiteralExpression */:
                    return bindObjectLiteralExpression(node);
                case 176 /* FunctionExpression */:
                case 177 /* ArrowFunction */:
                    return bindFunctionExpression(node);
                case 171 /* CallExpression */:
                    if (ts.isInJavaScriptFile(node)) {
                        bindCallExpression(node);
                    }
                    break;
                // Members of classes, interfaces, and modules
                case 189 /* ClassExpression */:
                case 217 /* ClassDeclaration */:
                    return bindClassLikeDeclaration(node);
                case 218 /* InterfaceDeclaration */:
                    return bindBlockScopedDeclaration(node, 64 /* Interface */, 792960 /* InterfaceExcludes */);
                case 219 /* TypeAliasDeclaration */:
                    return bindBlockScopedDeclaration(node, 524288 /* TypeAlias */, 793056 /* TypeAliasExcludes */);
                case 220 /* EnumDeclaration */:
                    return bindEnumDeclaration(node);
                case 221 /* ModuleDeclaration */:
                    return bindModuleDeclaration(node);
                // Imports and exports
                case 224 /* ImportEqualsDeclaration */:
                case 227 /* NamespaceImport */:
                case 229 /* ImportSpecifier */:
                case 233 /* ExportSpecifier */:
                    return declareSymbolAndAddToSymbolTable(node, 8388608 /* Alias */, 8388608 /* AliasExcludes */);
                case 226 /* ImportClause */:
                    return bindImportClause(node);
                case 231 /* ExportDeclaration */:
                    return bindExportDeclaration(node);
                case 230 /* ExportAssignment */:
                    return bindExportAssignment(node);
                case 251 /* SourceFile */:
                    return bindSourceFileIfExternalModule();
            }
        }
        function checkTypePredicate(node) {
            var parameterName = node.parameterName, type = node.type;
            if (parameterName && parameterName.kind === 69 /* Identifier */) {
                checkStrictModeIdentifier(parameterName);
            }
            if (parameterName && parameterName.kind === 162 /* ThisType */) {
                seenThisKeyword = true;
            }
            bind(type);
        }
        function bindSourceFileIfExternalModule() {
            setExportContextFlag(file);
            if (ts.isExternalModule(file)) {
                bindSourceFileAsExternalModule();
            }
        }
        function bindSourceFileAsExternalModule() {
            bindAnonymousDeclaration(file, 512 /* ValueModule */, "\"" + ts.removeFileExtension(file.fileName) + "\"");
        }
        function bindExportAssignment(node) {
            var boundExpression = node.kind === 230 /* ExportAssignment */ ? node.expression : node.right;
            if (!container.symbol || !container.symbol.exports) {
                // Export assignment in some sort of block construct
                bindAnonymousDeclaration(node, 8388608 /* Alias */, getDeclarationName(node));
            }
            else if (boundExpression.kind === 69 /* Identifier */ && node.kind === 230 /* ExportAssignment */) {
                // An export default clause with an identifier exports all meanings of that identifier
                declareSymbol(container.symbol.exports, container.symbol, node, 8388608 /* Alias */, 107455 /* PropertyExcludes */ | 8388608 /* AliasExcludes */);
            }
            else {
                // An export default clause with an expression exports a value
                declareSymbol(container.symbol.exports, container.symbol, node, 4 /* Property */, 107455 /* PropertyExcludes */ | 8388608 /* AliasExcludes */);
            }
        }
        function bindExportDeclaration(node) {
            if (!container.symbol || !container.symbol.exports) {
                // Export * in some sort of block construct
                bindAnonymousDeclaration(node, 1073741824 /* ExportStar */, getDeclarationName(node));
            }
            else if (!node.exportClause) {
                // All export * declarations are collected in an __export symbol
                declareSymbol(container.symbol.exports, container.symbol, node, 1073741824 /* ExportStar */, 0 /* None */);
            }
        }
        function bindImportClause(node) {
            if (node.name) {
                declareSymbolAndAddToSymbolTable(node, 8388608 /* Alias */, 8388608 /* AliasExcludes */);
            }
        }
        function setCommonJsModuleIndicator(node) {
            if (!file.commonJsModuleIndicator) {
                file.commonJsModuleIndicator = node;
                bindSourceFileAsExternalModule();
            }
        }
        function bindExportsPropertyAssignment(node) {
            // When we create a property via 'exports.foo = bar', the 'exports.foo' property access
            // expression is the declaration
            setCommonJsModuleIndicator(node);
            declareSymbol(file.symbol.exports, file.symbol, node.left, 4 /* Property */ | 7340032 /* Export */, 0 /* None */);
        }
        function bindModuleExportsAssignment(node) {
            // 'module.exports = expr' assignment
            setCommonJsModuleIndicator(node);
            bindExportAssignment(node);
        }
        function bindThisPropertyAssignment(node) {
            // Declare a 'member' in case it turns out the container was an ES5 class
            if (container.kind === 176 /* FunctionExpression */ || container.kind === 216 /* FunctionDeclaration */) {
                container.symbol.members = container.symbol.members || {};
                // It's acceptable for multiple 'this' assignments of the same identifier to occur
                declareSymbol(container.symbol.members, container.symbol, node, 4 /* Property */, 107455 /* PropertyExcludes */ & ~4 /* Property */);
            }
        }
        function bindPrototypePropertyAssignment(node) {
            // We saw a node of the form 'x.prototype.y = z'. Declare a 'member' y on x if x was a function.
            // Look up the function in the local scope, since prototype assignments should
            // follow the function declaration
            var leftSideOfAssignment = node.left;
            var classPrototype = leftSideOfAssignment.expression;
            var constructorFunction = classPrototype.expression;
            // Fix up parent pointers since we're going to use these nodes before we bind into them
            leftSideOfAssignment.parent = node;
            constructorFunction.parent = classPrototype;
            classPrototype.parent = leftSideOfAssignment;
            var funcSymbol = container.locals[constructorFunction.text];
            if (!funcSymbol || !(funcSymbol.flags & 16 /* Function */)) {
                return;
            }
            // Set up the members collection if it doesn't exist already
            if (!funcSymbol.members) {
                funcSymbol.members = {};
            }
            // Declare the method/property
            declareSymbol(funcSymbol.members, funcSymbol, leftSideOfAssignment, 4 /* Property */, 107455 /* PropertyExcludes */);
        }
        function bindCallExpression(node) {
            // We're only inspecting call expressions to detect CommonJS modules, so we can skip
            // this check if we've already seen the module indicator
            if (!file.commonJsModuleIndicator && ts.isRequireCall(node, /*checkArgumentIsStringLiteral*/ false)) {
                setCommonJsModuleIndicator(node);
            }
        }
        function bindClassLikeDeclaration(node) {
            if (!ts.isDeclarationFile(file) && !ts.isInAmbientContext(node)) {
                if (ts.getClassExtendsHeritageClauseElement(node) !== undefined) {
                    hasClassExtends = true;
                }
                if (ts.nodeIsDecorated(node)) {
                    hasDecorators = true;
                }
            }
            if (node.kind === 217 /* ClassDeclaration */) {
                bindBlockScopedDeclaration(node, 32 /* Class */, 899519 /* ClassExcludes */);
            }
            else {
                var bindingName = node.name ? node.name.text : "__class";
                bindAnonymousDeclaration(node, 32 /* Class */, bindingName);
                // Add name of class expression into the map for semantic classifier
                if (node.name) {
                    classifiableNames[node.name.text] = node.name.text;
                }
            }
            var symbol = node.symbol;
            // TypeScript 1.0 spec (April 2014): 8.4
            // Every class automatically contains a static property member named 'prototype', the
            // type of which is an instantiation of the class type with type Any supplied as a type
            // argument for each type parameter. It is an error to explicitly declare a static
            // property member with the name 'prototype'.
            //
            // Note: we check for this here because this class may be merging into a module.  The
            // module might have an exported variable called 'prototype'.  We can't allow that as
            // that would clash with the built-in 'prototype' for the class.
            var prototypeSymbol = createSymbol(4 /* Property */ | 134217728 /* Prototype */, "prototype");
            if (ts.hasProperty(symbol.exports, prototypeSymbol.name)) {
                if (node.name) {
                    node.name.parent = node;
                }
                file.bindDiagnostics.push(ts.createDiagnosticForNode(symbol.exports[prototypeSymbol.name].declarations[0], ts.Diagnostics.Duplicate_identifier_0, prototypeSymbol.name));
            }
            symbol.exports[prototypeSymbol.name] = prototypeSymbol;
            prototypeSymbol.parent = symbol;
        }
        function bindEnumDeclaration(node) {
            return ts.isConst(node)
                ? bindBlockScopedDeclaration(node, 128 /* ConstEnum */, 899967 /* ConstEnumExcludes */)
                : bindBlockScopedDeclaration(node, 256 /* RegularEnum */, 899327 /* RegularEnumExcludes */);
        }
        function bindVariableDeclarationOrBindingElement(node) {
            if (inStrictMode) {
                checkStrictModeEvalOrArguments(node, node.name);
            }
            if (!ts.isBindingPattern(node.name)) {
                if (ts.isBlockOrCatchScoped(node)) {
                    bindBlockScopedVariableDeclaration(node);
                }
                else if (ts.isParameterDeclaration(node)) {
                    // It is safe to walk up parent chain to find whether the node is a destructing parameter declaration
                    // because its parent chain has already been set up, since parents are set before descending into children.
                    //
                    // If node is a binding element in parameter declaration, we need to use ParameterExcludes.
                    // Using ParameterExcludes flag allows the compiler to report an error on duplicate identifiers in Parameter Declaration
                    // For example:
                    //      function foo([a,a]) {} // Duplicate Identifier error
                    //      function bar(a,a) {}   // Duplicate Identifier error, parameter declaration in this case is handled in bindParameter
                    //                             // which correctly set excluded symbols
                    declareSymbolAndAddToSymbolTable(node, 1 /* FunctionScopedVariable */, 107455 /* ParameterExcludes */);
                }
                else {
                    declareSymbolAndAddToSymbolTable(node, 1 /* FunctionScopedVariable */, 107454 /* FunctionScopedVariableExcludes */);
                }
            }
        }
        function bindParameter(node) {
            if (!ts.isDeclarationFile(file) &&
                !ts.isInAmbientContext(node) &&
                ts.nodeIsDecorated(node)) {
                hasDecorators = true;
                hasParameterDecorators = true;
            }
            if (inStrictMode) {
                // It is a SyntaxError if the identifier eval or arguments appears within a FormalParameterList of a
                // strict mode FunctionLikeDeclaration or FunctionExpression(13.1)
                checkStrictModeEvalOrArguments(node, node.name);
            }
            if (ts.isBindingPattern(node.name)) {
                bindAnonymousDeclaration(node, 1 /* FunctionScopedVariable */, getDestructuringParameterName(node));
            }
            else {
                declareSymbolAndAddToSymbolTable(node, 1 /* FunctionScopedVariable */, 107455 /* ParameterExcludes */);
            }
            // If this is a property-parameter, then also declare the property symbol into the
            // containing class.
            if (ts.isParameterPropertyDeclaration(node)) {
                var classDeclaration = node.parent.parent;
                declareSymbol(classDeclaration.symbol.members, classDeclaration.symbol, node, 4 /* Property */, 107455 /* PropertyExcludes */);
            }
        }
        function bindFunctionDeclaration(node) {
            if (!ts.isDeclarationFile(file) && !ts.isInAmbientContext(node)) {
                if (ts.isAsyncFunctionLike(node)) {
                    hasAsyncFunctions = true;
                }
            }
            // netbeanstypescript - Remove this when #7122 is fixed
            var p = node.parent;
            if (inStrictMode && !(file.languageVersion >= 2 /* ES6 */ ||
                p.kind === 222 /* ModuleBlock */ ||
                p.kind === 251 /* SourceFile */ ||
                p.kind === 195 /* Block */ && ts.isFunctionLike(p.parent))) {
                file.bindDiagnostics.push(ts.createDiagnosticForNode(node, {
                    code: 0, category: ts.DiagnosticCategory.Error, key: "",
                    message: "In pre-ES6 strict mode code, functions may be declared only at top level or immediately within another function."
                        + "\nSee https://github.com/Microsoft/TypeScript/issues/7122"
                }));
            }
            checkStrictModeFunctionName(node);
            return declareSymbolAndAddToSymbolTable(node, 16 /* Function */, 106927 /* FunctionExcludes */);
        }
        function bindFunctionExpression(node) {
            if (!ts.isDeclarationFile(file) && !ts.isInAmbientContext(node)) {
                if (ts.isAsyncFunctionLike(node)) {
                    hasAsyncFunctions = true;
                }
            }
            checkStrictModeFunctionName(node);
            var bindingName = node.name ? node.name.text : "__function";
            return bindAnonymousDeclaration(node, 16 /* Function */, bindingName);
        }
        function bindPropertyOrMethodOrAccessor(node, symbolFlags, symbolExcludes) {
            if (!ts.isDeclarationFile(file) && !ts.isInAmbientContext(node)) {
                if (ts.isAsyncFunctionLike(node)) {
                    hasAsyncFunctions = true;
                }
                if (ts.nodeIsDecorated(node)) {
                    hasDecorators = true;
                }
            }
            return ts.hasDynamicName(node)
                ? bindAnonymousDeclaration(node, symbolFlags, "__computed")
                : declareSymbolAndAddToSymbolTable(node, symbolFlags, symbolExcludes);
        }
        // reachability checks
        function pushNamedLabel(name) {
            initializeReachabilityStateIfNecessary();
            if (ts.hasProperty(labelIndexMap, name.text)) {
                return false;
            }
            labelIndexMap[name.text] = labelStack.push(1 /* Unintialized */) - 1;
            return true;
        }
        function pushImplicitLabel() {
            initializeReachabilityStateIfNecessary();
            var index = labelStack.push(1 /* Unintialized */) - 1;
            implicitLabels.push(index);
            return index;
        }
        function popNamedLabel(label, outerState) {
            var index = labelIndexMap[label.text];
            ts.Debug.assert(index !== undefined);
            ts.Debug.assert(labelStack.length == index + 1);
            labelIndexMap[label.text] = undefined;
            setCurrentStateAtLabel(labelStack.pop(), outerState, label);
        }
        function popImplicitLabel(implicitLabelIndex, outerState) {
            if (labelStack.length !== implicitLabelIndex + 1) {
                ts.Debug.assert(false, "Label stack: " + labelStack.length + ", index:" + implicitLabelIndex);
            }
            var i = implicitLabels.pop();
            if (implicitLabelIndex !== i) {
                ts.Debug.assert(false, "i: " + i + ", index: " + implicitLabelIndex);
            }
            setCurrentStateAtLabel(labelStack.pop(), outerState, /*name*/ undefined);
        }
        function setCurrentStateAtLabel(innerMergedState, outerState, label) {
            if (innerMergedState === 1 /* Unintialized */) {
                if (label && !options.allowUnusedLabels) {
                    file.bindDiagnostics.push(ts.createDiagnosticForNode(label, ts.Diagnostics.Unused_label));
                }
                currentReachabilityState = outerState;
            }
            else {
                currentReachabilityState = or(innerMergedState, outerState);
            }
        }
        function jumpToLabel(label, outerState) {
            initializeReachabilityStateIfNecessary();
            var index = label ? labelIndexMap[label.text] : ts.lastOrUndefined(implicitLabels);
            if (index === undefined) {
                // reference to unknown label or
                // break/continue used outside of loops
                return false;
            }
            var stateAtLabel = labelStack[index];
            labelStack[index] = stateAtLabel === 1 /* Unintialized */ ? outerState : or(stateAtLabel, outerState);
            return true;
        }
        function checkUnreachable(node) {
            switch (currentReachabilityState) {
                case 4 /* Unreachable */:
                    var reportError = 
                    // report error on all statements except empty ones
                    (ts.isStatement(node) && node.kind !== 197 /* EmptyStatement */) ||
                        // report error on class declarations
                        node.kind === 217 /* ClassDeclaration */ ||
                        // report error on instantiated modules or const-enums only modules if preserveConstEnums is set
                        (node.kind === 221 /* ModuleDeclaration */ && shouldReportErrorOnModuleDeclaration(node)) ||
                        // report error on regular enums and const enums if preserveConstEnums is set
                        (node.kind === 220 /* EnumDeclaration */ && (!ts.isConstEnumDeclaration(node) || options.preserveConstEnums));
                    if (reportError) {
                        currentReachabilityState = 8 /* ReportedUnreachable */;
                        // unreachable code is reported if
                        // - user has explicitly asked about it AND
                        // - statement is in not ambient context (statements in ambient context is already an error
                        //   so we should not report extras) AND
                        //   - node is not variable statement OR
                        //   - node is block scoped variable statement OR
                        //   - node is not block scoped variable statement and at least one variable declaration has initializer
                        //   Rationale: we don't want to report errors on non-initialized var's since they are hoisted
                        //   On the other side we do want to report errors on non-initialized 'lets' because of TDZ
                        var reportUnreachableCode = !options.allowUnreachableCode &&
                            !ts.isInAmbientContext(node) &&
                            (node.kind !== 196 /* VariableStatement */ ||
                                ts.getCombinedNodeFlags(node.declarationList) & 24576 /* BlockScoped */ ||
                                ts.forEach(node.declarationList.declarations, function (d) { return d.initializer; }));
                        if (reportUnreachableCode) {
                            errorOnFirstToken(node, ts.Diagnostics.Unreachable_code_detected);
                        }
                    }
                case 8 /* ReportedUnreachable */:
                    return true;
                default:
                    return false;
            }
            function shouldReportErrorOnModuleDeclaration(node) {
                var instanceState = getModuleInstanceState(node);
                return instanceState === 1 /* Instantiated */ || (instanceState === 2 /* ConstEnumOnly */ && options.preserveConstEnums);
            }
        }
        function initializeReachabilityStateIfNecessary() {
            if (labelIndexMap) {
                return;
            }
            currentReachabilityState = 2 /* Reachable */;
            labelIndexMap = {};
            labelStack = [];
            implicitLabels = [];
        }
    }
})(ts || (ts = {}));
