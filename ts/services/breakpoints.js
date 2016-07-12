// Copyright (c) Microsoft. All rights reserved. Licensed under the Apache License, Version 2.0. 
// See LICENSE.txt in the project root for complete license information.
/// <reference path='services.ts' />
/* @internal */
var ts;
(function (ts) {
    var BreakpointResolver;
    (function (BreakpointResolver) {
        /**
         * Get the breakpoint span in given sourceFile
         */
        function spanInSourceFileAtLocation(sourceFile, position) {
            // Cannot set breakpoint in dts file
            if (sourceFile.flags & 4096 /* DeclarationFile */) {
                return undefined;
            }
            var tokenAtLocation = ts.getTokenAtPosition(sourceFile, position);
            var lineOfPosition = sourceFile.getLineAndCharacterOfPosition(position).line;
            if (sourceFile.getLineAndCharacterOfPosition(tokenAtLocation.getStart(sourceFile)).line > lineOfPosition) {
                // Get previous token if the token is returned starts on new line
                // eg: let x =10; |--- cursor is here
                //     let y = 10; 
                // token at position will return let keyword on second line as the token but we would like to use 
                // token on same line if trailing trivia (comments or white spaces on same line) part of the last token on that line
                tokenAtLocation = ts.findPrecedingToken(tokenAtLocation.pos, sourceFile);
                // Its a blank line
                if (!tokenAtLocation || sourceFile.getLineAndCharacterOfPosition(tokenAtLocation.getEnd()).line !== lineOfPosition) {
                    return undefined;
                }
            }
            // Cannot set breakpoint in ambient declarations
            if (ts.isInAmbientContext(tokenAtLocation)) {
                return undefined;
            }
            // Get the span in the node based on its syntax
            return spanInNode(tokenAtLocation);
            function textSpan(startNode, endNode) {
                var start = startNode.decorators ?
                    ts.skipTrivia(sourceFile.text, startNode.decorators.end) :
                    startNode.getStart(sourceFile);
                return ts.createTextSpanFromBounds(start, (endNode || startNode).getEnd());
            }
            function textSpanEndingAtNextToken(startNode, previousTokenToFindNextEndToken) {
                return textSpan(startNode, ts.findNextToken(previousTokenToFindNextEndToken, previousTokenToFindNextEndToken.parent));
            }
            function spanInNodeIfStartsOnSameLine(node, otherwiseOnNode) {
                if (node && lineOfPosition === sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line) {
                    return spanInNode(node);
                }
                return spanInNode(otherwiseOnNode);
            }
            function spanInNodeArray(nodeArray) {
                return ts.createTextSpanFromBounds(ts.skipTrivia(sourceFile.text, nodeArray.pos), nodeArray.end);
            }
            function spanInPreviousNode(node) {
                return spanInNode(ts.findPrecedingToken(node.pos, sourceFile));
            }
            function spanInNextNode(node) {
                return spanInNode(ts.findNextToken(node, node.parent));
            }
            function spanInNode(node) {
                if (node) {
                    switch (node.kind) {
                        case 196 /* VariableStatement */:
                            // Span on first variable declaration
                            return spanInVariableDeclaration(node.declarationList.declarations[0]);
                        case 214 /* VariableDeclaration */:
                        case 142 /* PropertyDeclaration */:
                        case 141 /* PropertySignature */:
                            return spanInVariableDeclaration(node);
                        case 139 /* Parameter */:
                            return spanInParameterDeclaration(node);
                        case 216 /* FunctionDeclaration */:
                        case 144 /* MethodDeclaration */:
                        case 143 /* MethodSignature */:
                        case 146 /* GetAccessor */:
                        case 147 /* SetAccessor */:
                        case 145 /* Constructor */:
                        case 176 /* FunctionExpression */:
                        case 177 /* ArrowFunction */:
                            return spanInFunctionDeclaration(node);
                        case 195 /* Block */:
                            if (ts.isFunctionBlock(node)) {
                                return spanInFunctionBlock(node);
                            }
                        // Fall through
                        case 222 /* ModuleBlock */:
                            return spanInBlock(node);
                        case 247 /* CatchClause */:
                            return spanInBlock(node.block);
                        case 198 /* ExpressionStatement */:
                            // span on the expression
                            return textSpan(node.expression);
                        case 207 /* ReturnStatement */:
                            // span on return keyword and expression if present
                            return textSpan(node.getChildAt(0), node.expression);
                        case 201 /* WhileStatement */:
                            // Span on while(...)
                            return textSpanEndingAtNextToken(node, node.expression);
                        case 200 /* DoStatement */:
                            // span in statement of the do statement
                            return spanInNode(node.statement);
                        case 213 /* DebuggerStatement */:
                            // span on debugger keyword
                            return textSpan(node.getChildAt(0));
                        case 199 /* IfStatement */:
                            // set on if(..) span
                            return textSpanEndingAtNextToken(node, node.expression);
                        case 210 /* LabeledStatement */:
                            // span in statement
                            return spanInNode(node.statement);
                        case 206 /* BreakStatement */:
                        case 205 /* ContinueStatement */:
                            // On break or continue keyword and label if present
                            return textSpan(node.getChildAt(0), node.label);
                        case 202 /* ForStatement */:
                            return spanInForStatement(node);
                        case 203 /* ForInStatement */:
                            // span of for (a in ...)
                            return textSpanEndingAtNextToken(node, node.expression);
                        case 204 /* ForOfStatement */:
                            // span in initializer
                            return spanInInitializerOfForLike(node);
                        case 209 /* SwitchStatement */:
                            // span on switch(...)
                            return textSpanEndingAtNextToken(node, node.expression);
                        case 244 /* CaseClause */:
                        case 245 /* DefaultClause */:
                            // span in first statement of the clause
                            return spanInNode(node.statements[0]);
                        case 212 /* TryStatement */:
                            // span in try block
                            return spanInBlock(node.tryBlock);
                        case 211 /* ThrowStatement */:
                            // span in throw ...
                            return textSpan(node, node.expression);
                        case 230 /* ExportAssignment */:
                            // span on export = id
                            return textSpan(node, node.expression);
                        case 224 /* ImportEqualsDeclaration */:
                            // import statement without including semicolon
                            return textSpan(node, node.moduleReference);
                        case 225 /* ImportDeclaration */:
                            // import statement without including semicolon
                            return textSpan(node, node.moduleSpecifier);
                        case 231 /* ExportDeclaration */:
                            // import statement without including semicolon
                            return textSpan(node, node.moduleSpecifier);
                        case 221 /* ModuleDeclaration */:
                            // span on complete module if it is instantiated
                            if (ts.getModuleInstanceState(node) !== 1 /* Instantiated */) {
                                return undefined;
                            }
                        case 217 /* ClassDeclaration */:
                        case 220 /* EnumDeclaration */:
                        case 250 /* EnumMember */:
                        case 166 /* BindingElement */:
                            // span on complete node
                            return textSpan(node);
                        case 208 /* WithStatement */:
                            // span in statement
                            return spanInNode(node.statement);
                        case 140 /* Decorator */:
                            return spanInNodeArray(node.parent.decorators);
                        case 164 /* ObjectBindingPattern */:
                        case 165 /* ArrayBindingPattern */:
                            return spanInBindingPattern(node);
                        // No breakpoint in interface, type alias
                        case 218 /* InterfaceDeclaration */:
                        case 219 /* TypeAliasDeclaration */:
                            return undefined;
                        // Tokens:
                        case 23 /* SemicolonToken */:
                        case 1 /* EndOfFileToken */:
                            return spanInNodeIfStartsOnSameLine(ts.findPrecedingToken(node.pos, sourceFile));
                        case 24 /* CommaToken */:
                            return spanInPreviousNode(node);
                        case 15 /* OpenBraceToken */:
                            return spanInOpenBraceToken(node);
                        case 16 /* CloseBraceToken */:
                            return spanInCloseBraceToken(node);
                        case 20 /* CloseBracketToken */:
                            return spanInCloseBracketToken(node);
                        case 17 /* OpenParenToken */:
                            return spanInOpenParenToken(node);
                        case 18 /* CloseParenToken */:
                            return spanInCloseParenToken(node);
                        case 54 /* ColonToken */:
                            return spanInColonToken(node);
                        case 27 /* GreaterThanToken */:
                        case 25 /* LessThanToken */:
                            return spanInGreaterThanOrLessThanToken(node);
                        // Keywords:
                        case 104 /* WhileKeyword */:
                            return spanInWhileKeyword(node);
                        case 80 /* ElseKeyword */:
                        case 72 /* CatchKeyword */:
                        case 85 /* FinallyKeyword */:
                            return spanInNextNode(node);
                        case 135 /* OfKeyword */:
                            return spanInOfKeyword(node);
                        default:
                            // Destructuring pattern in destructuring assignment
                            // [a, b, c] of
                            // [a, b, c] = expression
                            if (ts.isArrayLiteralOrObjectLiteralDestructuringPattern(node)) {
                                return spanInArrayLiteralOrObjectLiteralDestructuringPattern(node);
                            }
                            // Set breakpoint on identifier element of destructuring pattern
                            // a or ...c  or d: x from 
                            // [a, b, ...c] or { a, b } or { d: x } from destructuring pattern
                            if ((node.kind === 69 /* Identifier */ ||
                                node.kind == 188 /* SpreadElementExpression */ ||
                                node.kind === 248 /* PropertyAssignment */ ||
                                node.kind === 249 /* ShorthandPropertyAssignment */) &&
                                ts.isArrayLiteralOrObjectLiteralDestructuringPattern(node.parent)) {
                                return textSpan(node);
                            }
                            if (node.kind === 184 /* BinaryExpression */) {
                                var binaryExpression = node;
                                // Set breakpoint in destructuring pattern if its destructuring assignment
                                // [a, b, c] or {a, b, c} of
                                // [a, b, c] = expression or 
                                // {a, b, c} = expression
                                if (ts.isArrayLiteralOrObjectLiteralDestructuringPattern(binaryExpression.left)) {
                                    return spanInArrayLiteralOrObjectLiteralDestructuringPattern(binaryExpression.left);
                                }
                                if (binaryExpression.operatorToken.kind === 56 /* EqualsToken */ &&
                                    ts.isArrayLiteralOrObjectLiteralDestructuringPattern(binaryExpression.parent)) {
                                    // Set breakpoint on assignment expression element of destructuring pattern
                                    // a = expression of 
                                    // [a = expression, b, c] = someExpression or 
                                    // { a = expression, b, c } = someExpression
                                    return textSpan(node);
                                }
                                if (binaryExpression.operatorToken.kind === 24 /* CommaToken */) {
                                    return spanInNode(binaryExpression.left);
                                }
                            }
                            if (ts.isExpression(node)) {
                                switch (node.parent.kind) {
                                    case 200 /* DoStatement */:
                                        // Set span as if on while keyword
                                        return spanInPreviousNode(node);
                                    case 140 /* Decorator */:
                                        // Set breakpoint on the decorator emit
                                        return spanInNode(node.parent);
                                    case 202 /* ForStatement */:
                                    case 204 /* ForOfStatement */:
                                        return textSpan(node);
                                    case 184 /* BinaryExpression */:
                                        if (node.parent.operatorToken.kind === 24 /* CommaToken */) {
                                            // if this is comma expression, the breakpoint is possible in this expression
                                            return textSpan(node);
                                        }
                                        break;
                                    case 177 /* ArrowFunction */:
                                        if (node.parent.body === node) {
                                            // If this is body of arrow function, it is allowed to have the breakpoint
                                            return textSpan(node);
                                        }
                                        break;
                                }
                            }
                            // If this is name of property assignment, set breakpoint in the initializer
                            if (node.parent.kind === 248 /* PropertyAssignment */ &&
                                node.parent.name === node &&
                                !ts.isArrayLiteralOrObjectLiteralDestructuringPattern(node.parent.parent)) {
                                return spanInNode(node.parent.initializer);
                            }
                            // Breakpoint in type assertion goes to its operand
                            if (node.parent.kind === 174 /* TypeAssertionExpression */ && node.parent.type === node) {
                                return spanInNextNode(node.parent.type);
                            }
                            // return type of function go to previous token
                            if (ts.isFunctionLike(node.parent) && node.parent.type === node) {
                                return spanInPreviousNode(node);
                            }
                            // initializer of variable/parameter declaration go to previous node
                            if ((node.parent.kind === 214 /* VariableDeclaration */ ||
                                node.parent.kind === 139 /* Parameter */)) {
                                var paramOrVarDecl = node.parent;
                                if (paramOrVarDecl.initializer === node ||
                                    paramOrVarDecl.type === node ||
                                    ts.isAssignmentOperator(node.kind)) {
                                    return spanInPreviousNode(node);
                                }
                            }
                            if (node.parent.kind === 184 /* BinaryExpression */) {
                                var binaryExpression = node.parent;
                                if (ts.isArrayLiteralOrObjectLiteralDestructuringPattern(binaryExpression.left) &&
                                    (binaryExpression.right === node ||
                                        binaryExpression.operatorToken === node)) {
                                    // If initializer of destructuring assignment move to previous token
                                    return spanInPreviousNode(node);
                                }
                            }
                            // Default go to parent to set the breakpoint
                            return spanInNode(node.parent);
                    }
                }
                function textSpanFromVariableDeclaration(variableDeclaration) {
                    var declarations = variableDeclaration.parent.declarations;
                    if (declarations && declarations[0] === variableDeclaration) {
                        // First declaration - include let keyword
                        return textSpan(ts.findPrecedingToken(variableDeclaration.pos, sourceFile, variableDeclaration.parent), variableDeclaration);
                    }
                    else {
                        // Span only on this declaration
                        return textSpan(variableDeclaration);
                    }
                }
                function spanInVariableDeclaration(variableDeclaration) {
                    // If declaration of for in statement, just set the span in parent
                    if (variableDeclaration.parent.parent.kind === 203 /* ForInStatement */) {
                        return spanInNode(variableDeclaration.parent.parent);
                    }
                    // If this is a destructuring pattern set breakpoint in binding pattern
                    if (ts.isBindingPattern(variableDeclaration.name)) {
                        return spanInBindingPattern(variableDeclaration.name);
                    }
                    // Breakpoint is possible in variableDeclaration only if there is initialization
                    // or its declaration from 'for of'
                    if (variableDeclaration.initializer ||
                        (variableDeclaration.flags & 2 /* Export */) ||
                        variableDeclaration.parent.parent.kind === 204 /* ForOfStatement */) {
                        return textSpanFromVariableDeclaration(variableDeclaration);
                    }
                    var declarations = variableDeclaration.parent.declarations;
                    if (declarations && declarations[0] !== variableDeclaration) {
                        // If we cant set breakpoint on this declaration, set it on previous one
                        // Because the variable declaration may be binding pattern and 
                        // we would like to set breakpoint in last binding element if thats the case,
                        // use preceding token instead
                        return spanInNode(ts.findPrecedingToken(variableDeclaration.pos, sourceFile, variableDeclaration.parent));
                    }
                }
                function canHaveSpanInParameterDeclaration(parameter) {
                    // Breakpoint is possible on parameter only if it has initializer, is a rest parameter, or has public or private modifier
                    return !!parameter.initializer || parameter.dotDotDotToken !== undefined ||
                        !!(parameter.flags & 8 /* Public */) || !!(parameter.flags & 16 /* Private */);
                }
                function spanInParameterDeclaration(parameter) {
                    if (ts.isBindingPattern(parameter.name)) {
                        // set breakpoint in binding pattern
                        return spanInBindingPattern(parameter.name);
                    }
                    else if (canHaveSpanInParameterDeclaration(parameter)) {
                        return textSpan(parameter);
                    }
                    else {
                        var functionDeclaration = parameter.parent;
                        var indexOfParameter = ts.indexOf(functionDeclaration.parameters, parameter);
                        if (indexOfParameter) {
                            // Not a first parameter, go to previous parameter
                            return spanInParameterDeclaration(functionDeclaration.parameters[indexOfParameter - 1]);
                        }
                        else {
                            // Set breakpoint in the function declaration body
                            return spanInNode(functionDeclaration.body);
                        }
                    }
                }
                function canFunctionHaveSpanInWholeDeclaration(functionDeclaration) {
                    return !!(functionDeclaration.flags & 2 /* Export */) ||
                        (functionDeclaration.parent.kind === 217 /* ClassDeclaration */ && functionDeclaration.kind !== 145 /* Constructor */);
                }
                function spanInFunctionDeclaration(functionDeclaration) {
                    // No breakpoints in the function signature
                    if (!functionDeclaration.body) {
                        return undefined;
                    }
                    if (canFunctionHaveSpanInWholeDeclaration(functionDeclaration)) {
                        // Set the span on whole function declaration
                        return textSpan(functionDeclaration);
                    }
                    // Set span in function body
                    return spanInNode(functionDeclaration.body);
                }
                function spanInFunctionBlock(block) {
                    var nodeForSpanInBlock = block.statements.length ? block.statements[0] : block.getLastToken();
                    if (canFunctionHaveSpanInWholeDeclaration(block.parent)) {
                        return spanInNodeIfStartsOnSameLine(block.parent, nodeForSpanInBlock);
                    }
                    return spanInNode(nodeForSpanInBlock);
                }
                function spanInBlock(block) {
                    switch (block.parent.kind) {
                        case 221 /* ModuleDeclaration */:
                            if (ts.getModuleInstanceState(block.parent) !== 1 /* Instantiated */) {
                                return undefined;
                            }
                        // Set on parent if on same line otherwise on first statement
                        case 201 /* WhileStatement */:
                        case 199 /* IfStatement */:
                        case 203 /* ForInStatement */:
                            return spanInNodeIfStartsOnSameLine(block.parent, block.statements[0]);
                        // Set span on previous token if it starts on same line otherwise on the first statement of the block
                        case 202 /* ForStatement */:
                        case 204 /* ForOfStatement */:
                            return spanInNodeIfStartsOnSameLine(ts.findPrecedingToken(block.pos, sourceFile, block.parent), block.statements[0]);
                    }
                    // Default action is to set on first statement
                    return spanInNode(block.statements[0]);
                }
                function spanInInitializerOfForLike(forLikeStaement) {
                    if (forLikeStaement.initializer.kind === 215 /* VariableDeclarationList */) {
                        // declaration list, set breakpoint in first declaration
                        var variableDeclarationList = forLikeStaement.initializer;
                        if (variableDeclarationList.declarations.length > 0) {
                            return spanInNode(variableDeclarationList.declarations[0]);
                        }
                    }
                    else {
                        // Expression - set breakpoint in it
                        return spanInNode(forLikeStaement.initializer);
                    }
                }
                function spanInForStatement(forStatement) {
                    if (forStatement.initializer) {
                        return spanInInitializerOfForLike(forStatement);
                    }
                    if (forStatement.condition) {
                        return textSpan(forStatement.condition);
                    }
                    if (forStatement.incrementor) {
                        return textSpan(forStatement.incrementor);
                    }
                }
                function spanInBindingPattern(bindingPattern) {
                    // Set breakpoint in first binding element
                    var firstBindingElement = ts.forEach(bindingPattern.elements, function (element) { return element.kind !== 190 /* OmittedExpression */ ? element : undefined; });
                    if (firstBindingElement) {
                        return spanInNode(firstBindingElement);
                    }
                    // Empty binding pattern of binding element, set breakpoint on binding element
                    if (bindingPattern.parent.kind === 166 /* BindingElement */) {
                        return textSpan(bindingPattern.parent);
                    }
                    // Variable declaration is used as the span
                    return textSpanFromVariableDeclaration(bindingPattern.parent);
                }
                function spanInArrayLiteralOrObjectLiteralDestructuringPattern(node) {
                    ts.Debug.assert(node.kind !== 165 /* ArrayBindingPattern */ && node.kind !== 164 /* ObjectBindingPattern */);
                    var elements = node.kind === 167 /* ArrayLiteralExpression */ ?
                        node.elements :
                        node.properties;
                    var firstBindingElement = ts.forEach(elements, function (element) { return element.kind !== 190 /* OmittedExpression */ ? element : undefined; });
                    if (firstBindingElement) {
                        return spanInNode(firstBindingElement);
                    }
                    // Could be ArrayLiteral from destructuring assignment or 
                    // just nested element in another destructuring assignment
                    // set breakpoint on assignment when parent is destructuring assignment
                    // Otherwise set breakpoint for this element
                    return textSpan(node.parent.kind === 184 /* BinaryExpression */ ? node.parent : node);
                }
                // Tokens:
                function spanInOpenBraceToken(node) {
                    switch (node.parent.kind) {
                        case 220 /* EnumDeclaration */:
                            var enumDeclaration = node.parent;
                            return spanInNodeIfStartsOnSameLine(ts.findPrecedingToken(node.pos, sourceFile, node.parent), enumDeclaration.members.length ? enumDeclaration.members[0] : enumDeclaration.getLastToken(sourceFile));
                        case 217 /* ClassDeclaration */:
                            var classDeclaration = node.parent;
                            return spanInNodeIfStartsOnSameLine(ts.findPrecedingToken(node.pos, sourceFile, node.parent), classDeclaration.members.length ? classDeclaration.members[0] : classDeclaration.getLastToken(sourceFile));
                        case 223 /* CaseBlock */:
                            return spanInNodeIfStartsOnSameLine(node.parent.parent, node.parent.clauses[0]);
                    }
                    // Default to parent node
                    return spanInNode(node.parent);
                }
                function spanInCloseBraceToken(node) {
                    switch (node.parent.kind) {
                        case 222 /* ModuleBlock */:
                            // If this is not instantiated module block no bp span
                            if (ts.getModuleInstanceState(node.parent.parent) !== 1 /* Instantiated */) {
                                return undefined;
                            }
                        case 220 /* EnumDeclaration */:
                        case 217 /* ClassDeclaration */:
                            // Span on close brace token
                            return textSpan(node);
                        case 195 /* Block */:
                            if (ts.isFunctionBlock(node.parent)) {
                                // Span on close brace token
                                return textSpan(node);
                            }
                        // fall through.
                        case 247 /* CatchClause */:
                            return spanInNode(ts.lastOrUndefined(node.parent.statements));
                        case 223 /* CaseBlock */:
                            // breakpoint in last statement of the last clause
                            var caseBlock = node.parent;
                            var lastClause = ts.lastOrUndefined(caseBlock.clauses);
                            if (lastClause) {
                                return spanInNode(ts.lastOrUndefined(lastClause.statements));
                            }
                            return undefined;
                        case 164 /* ObjectBindingPattern */:
                            // Breakpoint in last binding element or binding pattern if it contains no elements
                            var bindingPattern = node.parent;
                            return spanInNode(ts.lastOrUndefined(bindingPattern.elements) || bindingPattern);
                        // Default to parent node
                        default:
                            if (ts.isArrayLiteralOrObjectLiteralDestructuringPattern(node.parent)) {
                                // Breakpoint in last binding element or binding pattern if it contains no elements
                                var objectLiteral = node.parent;
                                return textSpan(ts.lastOrUndefined(objectLiteral.properties) || objectLiteral);
                            }
                            return spanInNode(node.parent);
                    }
                }
                function spanInCloseBracketToken(node) {
                    switch (node.parent.kind) {
                        case 165 /* ArrayBindingPattern */:
                            // Breakpoint in last binding element or binding pattern if it contains no elements
                            var bindingPattern = node.parent;
                            return textSpan(ts.lastOrUndefined(bindingPattern.elements) || bindingPattern);
                        default:
                            if (ts.isArrayLiteralOrObjectLiteralDestructuringPattern(node.parent)) {
                                // Breakpoint in last binding element or binding pattern if it contains no elements
                                var arrayLiteral = node.parent;
                                return textSpan(ts.lastOrUndefined(arrayLiteral.elements) || arrayLiteral);
                            }
                            // Default to parent node
                            return spanInNode(node.parent);
                    }
                }
                function spanInOpenParenToken(node) {
                    if (node.parent.kind === 200 /* DoStatement */ ||
                        node.parent.kind === 171 /* CallExpression */ ||
                        node.parent.kind === 172 /* NewExpression */) {
                        return spanInPreviousNode(node);
                    }
                    if (node.parent.kind === 175 /* ParenthesizedExpression */) {
                        return spanInNextNode(node);
                    }
                    // Default to parent node
                    return spanInNode(node.parent);
                }
                function spanInCloseParenToken(node) {
                    // Is this close paren token of parameter list, set span in previous token
                    switch (node.parent.kind) {
                        case 176 /* FunctionExpression */:
                        case 216 /* FunctionDeclaration */:
                        case 177 /* ArrowFunction */:
                        case 144 /* MethodDeclaration */:
                        case 143 /* MethodSignature */:
                        case 146 /* GetAccessor */:
                        case 147 /* SetAccessor */:
                        case 145 /* Constructor */:
                        case 201 /* WhileStatement */:
                        case 200 /* DoStatement */:
                        case 202 /* ForStatement */:
                        case 204 /* ForOfStatement */:
                        case 171 /* CallExpression */:
                        case 172 /* NewExpression */:
                        case 175 /* ParenthesizedExpression */:
                            return spanInPreviousNode(node);
                        // Default to parent node
                        default:
                            return spanInNode(node.parent);
                    }
                }
                function spanInColonToken(node) {
                    // Is this : specifying return annotation of the function declaration
                    if (ts.isFunctionLike(node.parent) ||
                        node.parent.kind === 248 /* PropertyAssignment */ ||
                        node.parent.kind === 139 /* Parameter */) {
                        return spanInPreviousNode(node);
                    }
                    return spanInNode(node.parent);
                }
                function spanInGreaterThanOrLessThanToken(node) {
                    if (node.parent.kind === 174 /* TypeAssertionExpression */) {
                        return spanInNextNode(node);
                    }
                    return spanInNode(node.parent);
                }
                function spanInWhileKeyword(node) {
                    if (node.parent.kind === 200 /* DoStatement */) {
                        // Set span on while expression
                        return textSpanEndingAtNextToken(node, node.parent.expression);
                    }
                    // Default to parent node
                    return spanInNode(node.parent);
                }
                function spanInOfKeyword(node) {
                    if (node.parent.kind === 204 /* ForOfStatement */) {
                        // set using next token
                        return spanInNextNode(node);
                    }
                    // Default to parent node
                    return spanInNode(node.parent);
                }
            }
        }
        BreakpointResolver.spanInSourceFileAtLocation = spanInSourceFileAtLocation;
    })(BreakpointResolver = ts.BreakpointResolver || (ts.BreakpointResolver = {}));
})(ts || (ts = {}));
