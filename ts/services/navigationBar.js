/// <reference path='services.ts' />
/* @internal */
var ts;
(function (ts) {
    var NavigationBar;
    (function (NavigationBar) {
        function getNavigationBarItems(sourceFile, compilerOptions) {
            // If the source file has any child items, then it included in the tree
            // and takes lexical ownership of all other top-level items.
            var hasGlobalNode = false;
            return getItemsWorker(getTopLevelNodes(sourceFile), createTopLevelItem);
            function getIndent(node) {
                // If we have a global node in the tree,
                // then it adds an extra layer of depth to all subnodes.
                var indent = hasGlobalNode ? 1 : 0;
                var current = node.parent;
                while (current) {
                    switch (current.kind) {
                        case 221 /* ModuleDeclaration */:
                            // If we have a module declared as A.B.C, it is more "intuitive"
                            // to say it only has a single layer of depth
                            do {
                                current = current.parent;
                            } while (current.kind === 221 /* ModuleDeclaration */);
                        // fall through
                        case 217 /* ClassDeclaration */:
                        case 220 /* EnumDeclaration */:
                        case 218 /* InterfaceDeclaration */:
                        case 216 /* FunctionDeclaration */:
                            indent++;
                    }
                    current = current.parent;
                }
                return indent;
            }
            function getChildNodes(nodes) {
                var childNodes = [];
                function visit(node) {
                    switch (node.kind) {
                        case 196 /* VariableStatement */:
                            ts.forEach(node.declarationList.declarations, visit);
                            break;
                        case 164 /* ObjectBindingPattern */:
                        case 165 /* ArrayBindingPattern */:
                            ts.forEach(node.elements, visit);
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
                                    childNodes.push(importClause);
                                }
                                // Handle named bindings in imports e.g.:
                                //    import * as NS from "mod";
                                //    import {a, b as B} from "mod";
                                if (importClause.namedBindings) {
                                    if (importClause.namedBindings.kind === 227 /* NamespaceImport */) {
                                        childNodes.push(importClause.namedBindings);
                                    }
                                    else {
                                        ts.forEach(importClause.namedBindings.elements, visit);
                                    }
                                }
                            }
                            break;
                        case 166 /* BindingElement */:
                        case 214 /* VariableDeclaration */:
                            if (ts.isBindingPattern(node.name)) {
                                visit(node.name);
                                break;
                            }
                        // Fall through
                        case 217 /* ClassDeclaration */:
                        case 220 /* EnumDeclaration */:
                        case 218 /* InterfaceDeclaration */:
                        case 221 /* ModuleDeclaration */:
                        case 216 /* FunctionDeclaration */:
                        case 224 /* ImportEqualsDeclaration */:
                        case 229 /* ImportSpecifier */:
                        case 233 /* ExportSpecifier */:
                            childNodes.push(node);
                            break;
                    }
                }
                //for (let i = 0, n = nodes.length; i < n; i++) {
                //    let node = nodes[i];
                //    if (node.kind === SyntaxKind.ClassDeclaration ||
                //        node.kind === SyntaxKind.EnumDeclaration ||
                //        node.kind === SyntaxKind.InterfaceDeclaration ||
                //        node.kind === SyntaxKind.ModuleDeclaration ||
                //        node.kind === SyntaxKind.FunctionDeclaration) {
                //        childNodes.push(node);
                //    }
                //    else if (node.kind === SyntaxKind.VariableStatement) {
                //        childNodes.push.apply(childNodes, (<VariableStatement>node).declarations);
                //    }
                //}
                ts.forEach(nodes, visit);
                return sortNodes(childNodes);
            }
            function getTopLevelNodes(node) {
                var topLevelNodes = [];
                topLevelNodes.push(node);
                addTopLevelNodes(node.statements, topLevelNodes);
                return topLevelNodes;
            }
            function sortNodes(nodes) {
                return nodes.slice(0).sort(function (n1, n2) {
                    if (n1.name && n2.name) {
                        return ts.getPropertyNameForPropertyNameNode(n1.name).localeCompare(ts.getPropertyNameForPropertyNameNode(n2.name));
                    }
                    else if (n1.name) {
                        return 1;
                    }
                    else if (n2.name) {
                        return -1;
                    }
                    else {
                        return n1.kind - n2.kind;
                    }
                });
            }
            function addTopLevelNodes(nodes, topLevelNodes) {
                nodes = sortNodes(nodes);
                for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
                    var node = nodes_1[_i];
                    switch (node.kind) {
                        case 217 /* ClassDeclaration */:
                        case 220 /* EnumDeclaration */:
                        case 218 /* InterfaceDeclaration */:
                            topLevelNodes.push(node);
                            break;
                        case 221 /* ModuleDeclaration */:
                            var moduleDeclaration = node;
                            topLevelNodes.push(node);
                            addTopLevelNodes(getInnermostModule(moduleDeclaration).body.statements, topLevelNodes);
                            break;
                        case 216 /* FunctionDeclaration */:
                            var functionDeclaration = node;
                            if (isTopLevelFunctionDeclaration(functionDeclaration)) {
                                topLevelNodes.push(node);
                                addTopLevelNodes(functionDeclaration.body.statements, topLevelNodes);
                            }
                            break;
                    }
                }
            }
            function isTopLevelFunctionDeclaration(functionDeclaration) {
                if (functionDeclaration.kind === 216 /* FunctionDeclaration */) {
                    // A function declaration is 'top level' if it contains any function declarations 
                    // within it. 
                    if (functionDeclaration.body && functionDeclaration.body.kind === 195 /* Block */) {
                        // Proper function declarations can only have identifier names
                        if (ts.forEach(functionDeclaration.body.statements, function (s) { return s.kind === 216 /* FunctionDeclaration */ && !isEmpty(s.name.text); })) {
                            return true;
                        }
                        // Or if it is not parented by another function.  i.e all functions
                        // at module scope are 'top level'.
                        if (!ts.isFunctionBlock(functionDeclaration.parent)) {
                            return true;
                        }
                    }
                }
                return false;
            }
            function getItemsWorker(nodes, createItem) {
                var items = [];
                var keyToItem = {};
                for (var _i = 0, nodes_2 = nodes; _i < nodes_2.length; _i++) {
                    var child = nodes_2[_i];
                    var item = createItem(child);
                    if (item !== undefined) {
                        if (item.text.length > 0) {
                            var key = item.text + "-" + item.kind + "-" + item.indent;
                            var itemWithSameName = keyToItem[key];
                            if (itemWithSameName) {
                                // We had an item with the same name.  Merge these items together.
                                merge(itemWithSameName, item);
                            }
                            else {
                                keyToItem[key] = item;
                                items.push(item);
                            }
                        }
                    }
                }
                return items;
            }
            function merge(target, source) {
                // First, add any spans in the source to the target.
                ts.addRange(target.spans, source.spans);
                if (source.childItems) {
                    if (!target.childItems) {
                        target.childItems = [];
                    }
                    // Next, recursively merge or add any children in the source as appropriate.
                    outer: for (var _i = 0, _a = source.childItems; _i < _a.length; _i++) {
                        var sourceChild = _a[_i];
                        for (var _b = 0, _c = target.childItems; _b < _c.length; _b++) {
                            var targetChild = _c[_b];
                            if (targetChild.text === sourceChild.text && targetChild.kind === sourceChild.kind) {
                                // Found a match.  merge them.
                                merge(targetChild, sourceChild);
                                continue outer;
                            }
                        }
                        // Didn't find a match, just add this child to the list.
                        target.childItems.push(sourceChild);
                    }
                }
            }
            function createChildItem(node) {
                switch (node.kind) {
                    case 139 /* Parameter */:
                        if (ts.isBindingPattern(node.name)) {
                            break;
                        }
                        if ((node.flags & 1022 /* Modifier */) === 0) {
                            return undefined;
                        }
                        return createItem(node, getTextOfNode(node.name), ts.ScriptElementKind.memberVariableElement);
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                        return createItem(node, getTextOfNode(node.name), ts.ScriptElementKind.memberFunctionElement);
                    case 146 /* GetAccessor */:
                        return createItem(node, getTextOfNode(node.name), ts.ScriptElementKind.memberGetAccessorElement);
                    case 147 /* SetAccessor */:
                        return createItem(node, getTextOfNode(node.name), ts.ScriptElementKind.memberSetAccessorElement);
                    case 150 /* IndexSignature */:
                        return createItem(node, "[]", ts.ScriptElementKind.indexSignatureElement);
                    case 250 /* EnumMember */:
                        return createItem(node, getTextOfNode(node.name), ts.ScriptElementKind.memberVariableElement);
                    case 148 /* CallSignature */:
                        return createItem(node, "()", ts.ScriptElementKind.callSignatureElement);
                    case 149 /* ConstructSignature */:
                        return createItem(node, "new()", ts.ScriptElementKind.constructSignatureElement);
                    case 142 /* PropertyDeclaration */:
                    case 141 /* PropertySignature */:
                        return createItem(node, getTextOfNode(node.name), ts.ScriptElementKind.memberVariableElement);
                    case 216 /* FunctionDeclaration */:
                        return createItem(node, getTextOfNode(node.name), ts.ScriptElementKind.functionElement);
                    case 214 /* VariableDeclaration */:
                    case 166 /* BindingElement */:
                        var variableDeclarationNode = void 0;
                        var name_1;
                        if (node.kind === 166 /* BindingElement */) {
                            name_1 = node.name;
                            variableDeclarationNode = node;
                            // binding elements are added only for variable declarations
                            // bubble up to the containing variable declaration
                            while (variableDeclarationNode && variableDeclarationNode.kind !== 214 /* VariableDeclaration */) {
                                variableDeclarationNode = variableDeclarationNode.parent;
                            }
                            ts.Debug.assert(variableDeclarationNode !== undefined);
                        }
                        else {
                            ts.Debug.assert(!ts.isBindingPattern(node.name));
                            variableDeclarationNode = node;
                            name_1 = node.name;
                        }
                        if (ts.isConst(variableDeclarationNode)) {
                            return createItem(node, getTextOfNode(name_1), ts.ScriptElementKind.constElement);
                        }
                        else if (ts.isLet(variableDeclarationNode)) {
                            return createItem(node, getTextOfNode(name_1), ts.ScriptElementKind.letElement);
                        }
                        else {
                            return createItem(node, getTextOfNode(name_1), ts.ScriptElementKind.variableElement);
                        }
                    case 145 /* Constructor */:
                        return createItem(node, "constructor", ts.ScriptElementKind.constructorImplementationElement);
                    case 233 /* ExportSpecifier */:
                    case 229 /* ImportSpecifier */:
                    case 224 /* ImportEqualsDeclaration */:
                    case 226 /* ImportClause */:
                    case 227 /* NamespaceImport */:
                        return createItem(node, getTextOfNode(node.name), ts.ScriptElementKind.alias);
                }
                return undefined;
                function createItem(node, name, scriptElementKind) {
                    return getNavigationBarItem(name, scriptElementKind, ts.getNodeModifiers(node), [getNodeSpan(node)]);
                }
            }
            function isEmpty(text) {
                return !text || text.trim() === "";
            }
            function getNavigationBarItem(text, kind, kindModifiers, spans, childItems, indent) {
                if (childItems === void 0) { childItems = []; }
                if (indent === void 0) { indent = 0; }
                if (isEmpty(text)) {
                    return undefined;
                }
                return {
                    text: text,
                    kind: kind,
                    kindModifiers: kindModifiers,
                    spans: spans,
                    childItems: childItems,
                    indent: indent,
                    bolded: false,
                    grayed: false
                };
            }
            function createTopLevelItem(node) {
                switch (node.kind) {
                    case 251 /* SourceFile */:
                        return createSourceFileItem(node);
                    case 217 /* ClassDeclaration */:
                        return createClassItem(node);
                    case 220 /* EnumDeclaration */:
                        return createEnumItem(node);
                    case 218 /* InterfaceDeclaration */:
                        return createIterfaceItem(node);
                    case 221 /* ModuleDeclaration */:
                        return createModuleItem(node);
                    case 216 /* FunctionDeclaration */:
                        return createFunctionItem(node);
                }
                return undefined;
                function getModuleName(moduleDeclaration) {
                    // We want to maintain quotation marks.
                    if (ts.isAmbientModule(moduleDeclaration)) {
                        return getTextOfNode(moduleDeclaration.name);
                    }
                    // Otherwise, we need to aggregate each identifier to build up the qualified name.
                    var result = [];
                    result.push(moduleDeclaration.name.text);
                    while (moduleDeclaration.body && moduleDeclaration.body.kind === 221 /* ModuleDeclaration */) {
                        moduleDeclaration = moduleDeclaration.body;
                        result.push(moduleDeclaration.name.text);
                    }
                    return result.join(".");
                }
                function createModuleItem(node) {
                    var moduleName = getModuleName(node);
                    var childItems = getItemsWorker(getChildNodes(getInnermostModule(node).body.statements), createChildItem);
                    return getNavigationBarItem(moduleName, ts.ScriptElementKind.moduleElement, ts.getNodeModifiers(node), [getNodeSpan(node)], childItems, getIndent(node));
                }
                function createFunctionItem(node) {
                    if (node.body && node.body.kind === 195 /* Block */) {
                        var childItems = getItemsWorker(sortNodes(node.body.statements), createChildItem);
                        return getNavigationBarItem(!node.name ? "default" : node.name.text, ts.ScriptElementKind.functionElement, ts.getNodeModifiers(node), [getNodeSpan(node)], childItems, getIndent(node));
                    }
                    return undefined;
                }
                function createSourceFileItem(node) {
                    var childItems = getItemsWorker(getChildNodes(node.statements), createChildItem);
                    if (childItems === undefined || childItems.length === 0) {
                        return undefined;
                    }
                    hasGlobalNode = true;
                    var rootName = ts.isExternalModule(node)
                        ? "\"" + ts.escapeString(ts.getBaseFileName(ts.removeFileExtension(ts.normalizePath(node.fileName)))) + "\""
                        : "<global>";
                    return getNavigationBarItem(rootName, ts.ScriptElementKind.moduleElement, ts.ScriptElementKindModifier.none, [getNodeSpan(node)], childItems);
                }
                function createClassItem(node) {
                    var childItems;
                    if (node.members) {
                        var constructor = ts.forEach(node.members, function (member) {
                            return member.kind === 145 /* Constructor */ && member;
                        });
                        // Add the constructor parameters in as children of the class (for property parameters).
                        // Note that *all non-binding pattern named* parameters will be added to the nodes array, but parameters that
                        // are not properties will be filtered out later by createChildItem.
                        var nodes = removeDynamicallyNamedProperties(node);
                        if (constructor) {
                            ts.addRange(nodes, ts.filter(constructor.parameters, function (p) { return !ts.isBindingPattern(p.name); }));
                        }
                        childItems = getItemsWorker(sortNodes(nodes), createChildItem);
                    }
                    var nodeName = !node.name ? "default" : node.name.text;
                    return getNavigationBarItem(nodeName, ts.ScriptElementKind.classElement, ts.getNodeModifiers(node), [getNodeSpan(node)], childItems, getIndent(node));
                }
                function createEnumItem(node) {
                    var childItems = getItemsWorker(sortNodes(removeComputedProperties(node)), createChildItem);
                    return getNavigationBarItem(node.name.text, ts.ScriptElementKind.enumElement, ts.getNodeModifiers(node), [getNodeSpan(node)], childItems, getIndent(node));
                }
                function createIterfaceItem(node) {
                    var childItems = getItemsWorker(sortNodes(removeDynamicallyNamedProperties(node)), createChildItem);
                    return getNavigationBarItem(node.name.text, ts.ScriptElementKind.interfaceElement, ts.getNodeModifiers(node), [getNodeSpan(node)], childItems, getIndent(node));
                }
            }
            function removeComputedProperties(node) {
                return ts.filter(node.members, function (member) { return member.name === undefined || member.name.kind !== 137 /* ComputedPropertyName */; });
            }
            /**
             * Like removeComputedProperties, but retains the properties with well known symbol names
             */
            function removeDynamicallyNamedProperties(node) {
                return ts.filter(node.members, function (member) { return !ts.hasDynamicName(member); });
            }
            function getInnermostModule(node) {
                while (node.body.kind === 221 /* ModuleDeclaration */) {
                    node = node.body;
                }
                return node;
            }
            function getNodeSpan(node) {
                return node.kind === 251 /* SourceFile */
                    ? ts.createTextSpanFromBounds(node.getFullStart(), node.getEnd())
                    : ts.createTextSpanFromBounds(node.getStart(), node.getEnd());
            }
            function getTextOfNode(node) {
                return ts.getTextOfNodeFromSourceText(sourceFile.text, node);
            }
        }
        NavigationBar.getNavigationBarItems = getNavigationBarItems;
    })(NavigationBar = ts.NavigationBar || (ts.NavigationBar = {}));
})(ts || (ts = {}));
