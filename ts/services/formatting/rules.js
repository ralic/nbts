///<reference path='references.ts' />
/* @internal */
var ts;
(function (ts) {
    var formatting;
    (function (formatting) {
        var Rules = (function () {
            function Rules() {
                ///
                /// Common Rules
                ///
                // Leave comments alone
                this.IgnoreBeforeComment = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.Comments), formatting.RuleOperation.create1(1 /* Ignore */));
                this.IgnoreAfterLineComment = new formatting.Rule(formatting.RuleDescriptor.create3(2 /* SingleLineCommentTrivia */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create1(1 /* Ignore */));
                // Space after keyword but not before ; or : or ?
                this.NoSpaceBeforeSemicolon = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 23 /* SemicolonToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.NoSpaceBeforeColon = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 54 /* ColonToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotBinaryOpContext), 8 /* Delete */));
                this.NoSpaceBeforeQuestionMark = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 53 /* QuestionToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotBinaryOpContext), 8 /* Delete */));
                this.SpaceAfterColon = new formatting.Rule(formatting.RuleDescriptor.create3(54 /* ColonToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotBinaryOpContext), 2 /* Space */));
                this.SpaceAfterQuestionMarkInConditionalOperator = new formatting.Rule(formatting.RuleDescriptor.create3(53 /* QuestionToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsConditionalOperatorContext), 2 /* Space */));
                this.NoSpaceAfterQuestionMark = new formatting.Rule(formatting.RuleDescriptor.create3(53 /* QuestionToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.SpaceAfterSemicolon = new formatting.Rule(formatting.RuleDescriptor.create3(23 /* SemicolonToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                // Space after }.
                this.SpaceAfterCloseBrace = new formatting.Rule(formatting.RuleDescriptor.create3(16 /* CloseBraceToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsAfterCodeBlockContext), 2 /* Space */));
                // Special case for (}, else) and (}, while) since else & while tokens are not part of the tree which makes SpaceAfterCloseBrace rule not applied
                this.SpaceBetweenCloseBraceAndElse = new formatting.Rule(formatting.RuleDescriptor.create1(16 /* CloseBraceToken */, 80 /* ElseKeyword */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                this.SpaceBetweenCloseBraceAndWhile = new formatting.Rule(formatting.RuleDescriptor.create1(16 /* CloseBraceToken */, 104 /* WhileKeyword */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                this.NoSpaceAfterCloseBrace = new formatting.Rule(formatting.RuleDescriptor.create3(16 /* CloseBraceToken */, formatting.Shared.TokenRange.FromTokens([18 /* CloseParenToken */, 20 /* CloseBracketToken */, 24 /* CommaToken */, 23 /* SemicolonToken */])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                // No space for dot
                this.NoSpaceBeforeDot = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 21 /* DotToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.NoSpaceAfterDot = new formatting.Rule(formatting.RuleDescriptor.create3(21 /* DotToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                // No space before and after indexer
                this.NoSpaceBeforeOpenBracket = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 19 /* OpenBracketToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.NoSpaceAfterCloseBracket = new formatting.Rule(formatting.RuleDescriptor.create3(20 /* CloseBracketToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotBeforeBlockInFunctionDeclarationContext), 8 /* Delete */));
                // Place a space before open brace in a function declaration
                this.FunctionOpenBraceLeftTokenRange = formatting.Shared.TokenRange.AnyIncludingMultilineComments;
                this.SpaceBeforeOpenBraceInFunction = new formatting.Rule(formatting.RuleDescriptor.create2(this.FunctionOpenBraceLeftTokenRange, 15 /* OpenBraceToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclContext, Rules.IsBeforeBlockContext, Rules.IsNotFormatOnEnter, Rules.IsSameLineTokenOrBeforeMultilineBlockContext), 2 /* Space */), 1 /* CanDeleteNewLines */);
                // Place a space before open brace in a TypeScript declaration that has braces as children (class, module, enum, etc)
                this.TypeScriptOpenBraceLeftTokenRange = formatting.Shared.TokenRange.FromTokens([69 /* Identifier */, 3 /* MultiLineCommentTrivia */, 73 /* ClassKeyword */]);
                this.SpaceBeforeOpenBraceInTypeScriptDeclWithBlock = new formatting.Rule(formatting.RuleDescriptor.create2(this.TypeScriptOpenBraceLeftTokenRange, 15 /* OpenBraceToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsTypeScriptDeclWithBlockContext, Rules.IsNotFormatOnEnter, Rules.IsSameLineTokenOrBeforeMultilineBlockContext), 2 /* Space */), 1 /* CanDeleteNewLines */);
                // Place a space before open brace in a control flow construct
                this.ControlOpenBraceLeftTokenRange = formatting.Shared.TokenRange.FromTokens([18 /* CloseParenToken */, 3 /* MultiLineCommentTrivia */, 79 /* DoKeyword */, 100 /* TryKeyword */, 85 /* FinallyKeyword */, 80 /* ElseKeyword */]);
                this.SpaceBeforeOpenBraceInControl = new formatting.Rule(formatting.RuleDescriptor.create2(this.ControlOpenBraceLeftTokenRange, 15 /* OpenBraceToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsControlDeclContext, Rules.IsNotFormatOnEnter, Rules.IsSameLineTokenOrBeforeMultilineBlockContext), 2 /* Space */), 1 /* CanDeleteNewLines */);
                // Insert a space after { and before } in single-line contexts, but remove space from empty object literals {}.
                this.SpaceAfterOpenBrace = new formatting.Rule(formatting.RuleDescriptor.create3(15 /* OpenBraceToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSingleLineBlockContext), 2 /* Space */));
                this.SpaceBeforeCloseBrace = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 16 /* CloseBraceToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSingleLineBlockContext), 2 /* Space */));
                this.NoSpaceBetweenEmptyBraceBrackets = new formatting.Rule(formatting.RuleDescriptor.create1(15 /* OpenBraceToken */, 16 /* CloseBraceToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsObjectContext), 8 /* Delete */));
                // Insert new line after { and before } in multi-line contexts.
                this.NewLineAfterOpenBraceInBlockContext = new formatting.Rule(formatting.RuleDescriptor.create3(15 /* OpenBraceToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsMultilineBlockContext), 4 /* NewLine */));
                // For functions and control block place } on a new line    [multi-line rule]
                this.NewLineBeforeCloseBraceInBlockContext = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.AnyIncludingMultilineComments, 16 /* CloseBraceToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsMultilineBlockContext), 4 /* NewLine */));
                // Special handling of unary operators.
                // Prefix operators generally shouldn't have a space between
                // them and their target unary expression.
                this.NoSpaceAfterUnaryPrefixOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.UnaryPrefixOperators, formatting.Shared.TokenRange.UnaryPrefixExpressions), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotBinaryOpContext), 8 /* Delete */));
                this.NoSpaceAfterUnaryPreincrementOperator = new formatting.Rule(formatting.RuleDescriptor.create3(41 /* PlusPlusToken */, formatting.Shared.TokenRange.UnaryPreincrementExpressions), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.NoSpaceAfterUnaryPredecrementOperator = new formatting.Rule(formatting.RuleDescriptor.create3(42 /* MinusMinusToken */, formatting.Shared.TokenRange.UnaryPredecrementExpressions), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.NoSpaceBeforeUnaryPostincrementOperator = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.UnaryPostincrementExpressions, 41 /* PlusPlusToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.NoSpaceBeforeUnaryPostdecrementOperator = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.UnaryPostdecrementExpressions, 42 /* MinusMinusToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                // More unary operator special-casing.
                // DevDiv 181814:  Be careful when removing leading whitespace
                // around unary operators.  Examples:
                //      1 - -2  --X-->  1--2
                //      a + ++b --X-->  a+++b
                this.SpaceAfterPostincrementWhenFollowedByAdd = new formatting.Rule(formatting.RuleDescriptor.create1(41 /* PlusPlusToken */, 35 /* PlusToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), 2 /* Space */));
                this.SpaceAfterAddWhenFollowedByUnaryPlus = new formatting.Rule(formatting.RuleDescriptor.create1(35 /* PlusToken */, 35 /* PlusToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), 2 /* Space */));
                this.SpaceAfterAddWhenFollowedByPreincrement = new formatting.Rule(formatting.RuleDescriptor.create1(35 /* PlusToken */, 41 /* PlusPlusToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), 2 /* Space */));
                this.SpaceAfterPostdecrementWhenFollowedBySubtract = new formatting.Rule(formatting.RuleDescriptor.create1(42 /* MinusMinusToken */, 36 /* MinusToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), 2 /* Space */));
                this.SpaceAfterSubtractWhenFollowedByUnaryMinus = new formatting.Rule(formatting.RuleDescriptor.create1(36 /* MinusToken */, 36 /* MinusToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), 2 /* Space */));
                this.SpaceAfterSubtractWhenFollowedByPredecrement = new formatting.Rule(formatting.RuleDescriptor.create1(36 /* MinusToken */, 42 /* MinusMinusToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), 2 /* Space */));
                this.NoSpaceBeforeComma = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 24 /* CommaToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.SpaceAfterCertainKeywords = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.FromTokens([102 /* VarKeyword */, 98 /* ThrowKeyword */, 92 /* NewKeyword */, 78 /* DeleteKeyword */, 94 /* ReturnKeyword */, 101 /* TypeOfKeyword */, 119 /* AwaitKeyword */]), formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                this.SpaceAfterLetConstInVariableDeclaration = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.FromTokens([108 /* LetKeyword */, 74 /* ConstKeyword */]), formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsStartOfVariableDeclarationList), 2 /* Space */));
                this.NoSpaceBeforeOpenParenInFuncCall = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 17 /* OpenParenToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsFunctionCallOrNewContext, Rules.IsPreviousTokenNotComma), 8 /* Delete */));
                this.SpaceAfterFunctionInFuncDecl = new formatting.Rule(formatting.RuleDescriptor.create3(87 /* FunctionKeyword */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclContext), 2 /* Space */));
                this.NoSpaceBeforeOpenParenInFuncDecl = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 17 /* OpenParenToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsFunctionDeclContext), 8 /* Delete */));
                this.SpaceAfterVoidOperator = new formatting.Rule(formatting.RuleDescriptor.create3(103 /* VoidKeyword */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsVoidOpContext), 2 /* Space */));
                this.NoSpaceBetweenReturnAndSemicolon = new formatting.Rule(formatting.RuleDescriptor.create1(94 /* ReturnKeyword */, 23 /* SemicolonToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                // Add a space between statements. All keywords except (do,else,case) has open/close parens after them.
                // So, we have a rule to add a space for [),Any], [do,Any], [else,Any], and [case,Any]
                this.SpaceBetweenStatements = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.FromTokens([18 /* CloseParenToken */, 79 /* DoKeyword */, 80 /* ElseKeyword */, 71 /* CaseKeyword */]), formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotForContext), 2 /* Space */));
                // This low-pri rule takes care of "try {" and "finally {" in case the rule SpaceBeforeOpenBraceInControl didn't execute on FormatOnEnter.
                this.SpaceAfterTryFinally = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.FromTokens([100 /* TryKeyword */, 85 /* FinallyKeyword */]), 15 /* OpenBraceToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                //      get x() {}
                //      set x(val) {}
                this.SpaceAfterGetSetInMember = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.FromTokens([123 /* GetKeyword */, 129 /* SetKeyword */]), 69 /* Identifier */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclContext), 2 /* Space */));
                // Special case for binary operators (that are keywords). For these we have to add a space and shouldn't follow any user options.
                this.SpaceBeforeBinaryKeywordOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.BinaryKeywordOperators), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), 2 /* Space */));
                this.SpaceAfterBinaryKeywordOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.BinaryKeywordOperators, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), 2 /* Space */));
                // TypeScript-specific higher priority rules
                // Treat constructor as an identifier in a function declaration, and remove spaces between constructor and following left parentheses
                this.NoSpaceAfterConstructor = new formatting.Rule(formatting.RuleDescriptor.create1(121 /* ConstructorKeyword */, 17 /* OpenParenToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                // Use of module as a function call. e.g.: import m2 = module("m2");
                this.NoSpaceAfterModuleImport = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.FromTokens([125 /* ModuleKeyword */, 127 /* RequireKeyword */]), 17 /* OpenParenToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                // Add a space around certain TypeScript keywords
                this.SpaceAfterCertainTypeScriptKeywords = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.FromTokens([115 /* AbstractKeyword */, 73 /* ClassKeyword */, 122 /* DeclareKeyword */, 77 /* DefaultKeyword */, 81 /* EnumKeyword */, 82 /* ExportKeyword */, 83 /* ExtendsKeyword */, 123 /* GetKeyword */, 106 /* ImplementsKeyword */, 89 /* ImportKeyword */, 107 /* InterfaceKeyword */, 125 /* ModuleKeyword */, 126 /* NamespaceKeyword */, 110 /* PrivateKeyword */, 112 /* PublicKeyword */, 111 /* ProtectedKeyword */, 129 /* SetKeyword */, 113 /* StaticKeyword */, 132 /* TypeKeyword */]), formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                this.SpaceBeforeCertainTypeScriptKeywords = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.FromTokens([83 /* ExtendsKeyword */, 106 /* ImplementsKeyword */])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                // Treat string literals in module names as identifiers, and add a space between the literal and the opening Brace braces, e.g.: module "m2" {
                this.SpaceAfterModuleName = new formatting.Rule(formatting.RuleDescriptor.create1(9 /* StringLiteral */, 15 /* OpenBraceToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsModuleDeclContext), 2 /* Space */));
                // Lambda expressions
                this.SpaceBeforeArrow = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 34 /* EqualsGreaterThanToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                this.SpaceAfterArrow = new formatting.Rule(formatting.RuleDescriptor.create3(34 /* EqualsGreaterThanToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                // Optional parameters and let args
                this.NoSpaceAfterEllipsis = new formatting.Rule(formatting.RuleDescriptor.create1(22 /* DotDotDotToken */, 69 /* Identifier */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.NoSpaceAfterOptionalParameters = new formatting.Rule(formatting.RuleDescriptor.create3(53 /* QuestionToken */, formatting.Shared.TokenRange.FromTokens([18 /* CloseParenToken */, 24 /* CommaToken */])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNotBinaryOpContext), 8 /* Delete */));
                // generics and type assertions
                this.NoSpaceBeforeOpenAngularBracket = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.TypeNames, 25 /* LessThanToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsTypeArgumentOrParameterOrAssertionContext), 8 /* Delete */));
                this.NoSpaceBetweenCloseParenAndAngularBracket = new formatting.Rule(formatting.RuleDescriptor.create1(18 /* CloseParenToken */, 25 /* LessThanToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsTypeArgumentOrParameterOrAssertionContext), 8 /* Delete */));
                this.NoSpaceAfterOpenAngularBracket = new formatting.Rule(formatting.RuleDescriptor.create3(25 /* LessThanToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsTypeArgumentOrParameterOrAssertionContext), 8 /* Delete */));
                this.NoSpaceBeforeCloseAngularBracket = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 27 /* GreaterThanToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsTypeArgumentOrParameterOrAssertionContext), 8 /* Delete */));
                this.NoSpaceAfterCloseAngularBracket = new formatting.Rule(formatting.RuleDescriptor.create3(27 /* GreaterThanToken */, formatting.Shared.TokenRange.FromTokens([17 /* OpenParenToken */, 19 /* OpenBracketToken */, 27 /* GreaterThanToken */, 24 /* CommaToken */])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsTypeArgumentOrParameterOrAssertionContext), 8 /* Delete */));
                this.NoSpaceAfterTypeAssertion = new formatting.Rule(formatting.RuleDescriptor.create3(27 /* GreaterThanToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsTypeAssertionContext), 8 /* Delete */));
                // Remove spaces in empty interface literals. e.g.: x: {}
                this.NoSpaceBetweenEmptyInterfaceBraceBrackets = new formatting.Rule(formatting.RuleDescriptor.create1(15 /* OpenBraceToken */, 16 /* CloseBraceToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsObjectTypeContext), 8 /* Delete */));
                // decorators
                this.SpaceBeforeAt = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 55 /* AtToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                this.NoSpaceAfterAt = new formatting.Rule(formatting.RuleDescriptor.create3(55 /* AtToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.SpaceAfterDecorator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.FromTokens([115 /* AbstractKeyword */, 69 /* Identifier */, 82 /* ExportKeyword */, 77 /* DefaultKeyword */, 73 /* ClassKeyword */, 113 /* StaticKeyword */, 112 /* PublicKeyword */, 110 /* PrivateKeyword */, 111 /* ProtectedKeyword */, 123 /* GetKeyword */, 129 /* SetKeyword */, 19 /* OpenBracketToken */, 37 /* AsteriskToken */])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsEndOfDecoratorContextOnSameLine), 2 /* Space */));
                this.NoSpaceBetweenFunctionKeywordAndStar = new formatting.Rule(formatting.RuleDescriptor.create1(87 /* FunctionKeyword */, 37 /* AsteriskToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclarationOrFunctionExpressionContext), 8 /* Delete */));
                this.SpaceAfterStarInGeneratorDeclaration = new formatting.Rule(formatting.RuleDescriptor.create3(37 /* AsteriskToken */, formatting.Shared.TokenRange.FromTokens([69 /* Identifier */, 17 /* OpenParenToken */])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclarationOrFunctionExpressionContext), 2 /* Space */));
                this.NoSpaceBetweenYieldKeywordAndStar = new formatting.Rule(formatting.RuleDescriptor.create1(114 /* YieldKeyword */, 37 /* AsteriskToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsYieldOrYieldStarWithOperand), 8 /* Delete */));
                this.SpaceBetweenYieldOrYieldStarAndOperand = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.FromTokens([114 /* YieldKeyword */, 37 /* AsteriskToken */]), formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsYieldOrYieldStarWithOperand), 2 /* Space */));
                // Async-await
                this.SpaceBetweenAsyncAndOpenParen = new formatting.Rule(formatting.RuleDescriptor.create1(118 /* AsyncKeyword */, 17 /* OpenParenToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsArrowFunctionContext, Rules.IsSameLineTokenContext), 2 /* Space */));
                this.SpaceBetweenAsyncAndFunctionKeyword = new formatting.Rule(formatting.RuleDescriptor.create1(118 /* AsyncKeyword */, 87 /* FunctionKeyword */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                // template string
                this.NoSpaceBetweenTagAndTemplateString = new formatting.Rule(formatting.RuleDescriptor.create3(69 /* Identifier */, formatting.Shared.TokenRange.FromTokens([11 /* NoSubstitutionTemplateLiteral */, 12 /* TemplateHead */])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                // These rules are higher in priority than user-configurable rules.
                this.HighPriorityCommonRules = [
                    this.IgnoreBeforeComment, this.IgnoreAfterLineComment,
                    this.NoSpaceBeforeColon, this.SpaceAfterColon, this.NoSpaceBeforeQuestionMark, this.SpaceAfterQuestionMarkInConditionalOperator,
                    this.NoSpaceAfterQuestionMark,
                    this.NoSpaceBeforeDot, this.NoSpaceAfterDot,
                    this.NoSpaceAfterUnaryPrefixOperator,
                    this.NoSpaceAfterUnaryPreincrementOperator, this.NoSpaceAfterUnaryPredecrementOperator,
                    this.NoSpaceBeforeUnaryPostincrementOperator, this.NoSpaceBeforeUnaryPostdecrementOperator,
                    this.SpaceAfterPostincrementWhenFollowedByAdd,
                    this.SpaceAfterAddWhenFollowedByUnaryPlus, this.SpaceAfterAddWhenFollowedByPreincrement,
                    this.SpaceAfterPostdecrementWhenFollowedBySubtract,
                    this.SpaceAfterSubtractWhenFollowedByUnaryMinus, this.SpaceAfterSubtractWhenFollowedByPredecrement,
                    this.NoSpaceAfterCloseBrace,
                    this.SpaceAfterOpenBrace, this.SpaceBeforeCloseBrace, this.NewLineBeforeCloseBraceInBlockContext,
                    this.SpaceAfterCloseBrace, this.SpaceBetweenCloseBraceAndElse, this.SpaceBetweenCloseBraceAndWhile, this.NoSpaceBetweenEmptyBraceBrackets,
                    this.NoSpaceBetweenFunctionKeywordAndStar, this.SpaceAfterStarInGeneratorDeclaration,
                    this.SpaceAfterFunctionInFuncDecl, this.NewLineAfterOpenBraceInBlockContext, this.SpaceAfterGetSetInMember,
                    this.NoSpaceBetweenYieldKeywordAndStar, this.SpaceBetweenYieldOrYieldStarAndOperand,
                    this.NoSpaceBetweenReturnAndSemicolon,
                    this.SpaceAfterCertainKeywords,
                    this.SpaceAfterLetConstInVariableDeclaration,
                    this.NoSpaceBeforeOpenParenInFuncCall,
                    this.SpaceBeforeBinaryKeywordOperator, this.SpaceAfterBinaryKeywordOperator,
                    this.SpaceAfterVoidOperator,
                    this.SpaceBetweenAsyncAndOpenParen, this.SpaceBetweenAsyncAndFunctionKeyword,
                    this.NoSpaceBetweenTagAndTemplateString,
                    // TypeScript-specific rules
                    this.NoSpaceAfterConstructor, this.NoSpaceAfterModuleImport,
                    this.SpaceAfterCertainTypeScriptKeywords, this.SpaceBeforeCertainTypeScriptKeywords,
                    this.SpaceAfterModuleName,
                    this.SpaceBeforeArrow, this.SpaceAfterArrow,
                    this.NoSpaceAfterEllipsis,
                    this.NoSpaceAfterOptionalParameters,
                    this.NoSpaceBetweenEmptyInterfaceBraceBrackets,
                    this.NoSpaceBeforeOpenAngularBracket,
                    this.NoSpaceBetweenCloseParenAndAngularBracket,
                    this.NoSpaceAfterOpenAngularBracket,
                    this.NoSpaceBeforeCloseAngularBracket,
                    this.NoSpaceAfterCloseAngularBracket,
                    this.NoSpaceAfterTypeAssertion,
                    this.SpaceBeforeAt,
                    this.NoSpaceAfterAt,
                    this.SpaceAfterDecorator,
                ];
                // These rules are lower in priority than user-configurable rules.
                this.LowPriorityCommonRules = [
                    this.NoSpaceBeforeSemicolon,
                    this.SpaceBeforeOpenBraceInControl, this.SpaceBeforeOpenBraceInFunction, this.SpaceBeforeOpenBraceInTypeScriptDeclWithBlock,
                    this.NoSpaceBeforeComma,
                    this.NoSpaceBeforeOpenBracket,
                    this.NoSpaceAfterCloseBracket,
                    this.SpaceAfterSemicolon,
                    this.NoSpaceBeforeOpenParenInFuncDecl,
                    this.SpaceBetweenStatements, this.SpaceAfterTryFinally
                ];
                ///
                /// Rules controlled by user options
                ///
                // Insert space after comma delimiter
                this.SpaceAfterComma = new formatting.Rule(formatting.RuleDescriptor.create3(24 /* CommaToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsNextTokenNotCloseBracket), 2 /* Space */));
                this.NoSpaceAfterComma = new formatting.Rule(formatting.RuleDescriptor.create3(24 /* CommaToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                // Insert space before and after binary operators
                this.SpaceBeforeBinaryOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.BinaryOperators), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), 2 /* Space */));
                this.SpaceAfterBinaryOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.BinaryOperators, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), 2 /* Space */));
                this.NoSpaceBeforeBinaryOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.BinaryOperators), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), 8 /* Delete */));
                this.NoSpaceAfterBinaryOperator = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.BinaryOperators, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsBinaryOpContext), 8 /* Delete */));
                // Insert space after keywords in control flow statements
                this.SpaceAfterKeywordInControl = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Keywords, 17 /* OpenParenToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsControlDeclContext), 2 /* Space */));
                this.NoSpaceAfterKeywordInControl = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Keywords, 17 /* OpenParenToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsControlDeclContext), 8 /* Delete */));
                // Open Brace braces after function
                //TypeScript: Function can have return types, which can be made of tons of different token kinds
                this.NewLineBeforeOpenBraceInFunction = new formatting.Rule(formatting.RuleDescriptor.create2(this.FunctionOpenBraceLeftTokenRange, 15 /* OpenBraceToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclContext, Rules.IsBeforeMultilineBlockContext), 4 /* NewLine */), 1 /* CanDeleteNewLines */);
                // Open Brace braces after TypeScript module/class/interface
                this.NewLineBeforeOpenBraceInTypeScriptDeclWithBlock = new formatting.Rule(formatting.RuleDescriptor.create2(this.TypeScriptOpenBraceLeftTokenRange, 15 /* OpenBraceToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsTypeScriptDeclWithBlockContext, Rules.IsBeforeMultilineBlockContext), 4 /* NewLine */), 1 /* CanDeleteNewLines */);
                // Open Brace braces after control block
                this.NewLineBeforeOpenBraceInControl = new formatting.Rule(formatting.RuleDescriptor.create2(this.ControlOpenBraceLeftTokenRange, 15 /* OpenBraceToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsControlDeclContext, Rules.IsBeforeMultilineBlockContext), 4 /* NewLine */), 1 /* CanDeleteNewLines */);
                // Insert space after semicolon in for statement
                this.SpaceAfterSemicolonInFor = new formatting.Rule(formatting.RuleDescriptor.create3(23 /* SemicolonToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsForContext), 2 /* Space */));
                this.NoSpaceAfterSemicolonInFor = new formatting.Rule(formatting.RuleDescriptor.create3(23 /* SemicolonToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext, Rules.IsForContext), 8 /* Delete */));
                // Insert space after opening and before closing nonempty parenthesis
                this.SpaceAfterOpenParen = new formatting.Rule(formatting.RuleDescriptor.create3(17 /* OpenParenToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                this.SpaceBeforeCloseParen = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 18 /* CloseParenToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                this.NoSpaceBetweenParens = new formatting.Rule(formatting.RuleDescriptor.create1(17 /* OpenParenToken */, 18 /* CloseParenToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.NoSpaceAfterOpenParen = new formatting.Rule(formatting.RuleDescriptor.create3(17 /* OpenParenToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.NoSpaceBeforeCloseParen = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 18 /* CloseParenToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                // Insert space after opening and before closing nonempty brackets
                this.SpaceAfterOpenBracket = new formatting.Rule(formatting.RuleDescriptor.create3(19 /* OpenBracketToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                this.SpaceBeforeCloseBracket = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 20 /* CloseBracketToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                this.NoSpaceBetweenBrackets = new formatting.Rule(formatting.RuleDescriptor.create1(19 /* OpenBracketToken */, 20 /* CloseBracketToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.NoSpaceAfterOpenBracket = new formatting.Rule(formatting.RuleDescriptor.create3(19 /* OpenBracketToken */, formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.NoSpaceBeforeCloseBracket = new formatting.Rule(formatting.RuleDescriptor.create2(formatting.Shared.TokenRange.Any, 20 /* CloseBracketToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                // Insert space after opening and before closing template string braces
                this.NoSpaceAfterTemplateHeadAndMiddle = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.FromTokens([12 /* TemplateHead */, 13 /* TemplateMiddle */]), formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.SpaceAfterTemplateHeadAndMiddle = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.FromTokens([12 /* TemplateHead */, 13 /* TemplateMiddle */]), formatting.Shared.TokenRange.Any), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                this.NoSpaceBeforeTemplateMiddleAndTail = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.FromTokens([13 /* TemplateMiddle */, 14 /* TemplateTail */])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 8 /* Delete */));
                this.SpaceBeforeTemplateMiddleAndTail = new formatting.Rule(formatting.RuleDescriptor.create4(formatting.Shared.TokenRange.Any, formatting.Shared.TokenRange.FromTokens([13 /* TemplateMiddle */, 14 /* TemplateTail */])), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsSameLineTokenContext), 2 /* Space */));
                // Insert space after function keyword for anonymous functions
                this.SpaceAfterAnonymousFunctionKeyword = new formatting.Rule(formatting.RuleDescriptor.create1(87 /* FunctionKeyword */, 17 /* OpenParenToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclContext), 2 /* Space */));
                this.NoSpaceAfterAnonymousFunctionKeyword = new formatting.Rule(formatting.RuleDescriptor.create1(87 /* FunctionKeyword */, 17 /* OpenParenToken */), formatting.RuleOperation.create2(new formatting.RuleOperationContext(Rules.IsFunctionDeclContext), 8 /* Delete */));
            }
            Rules.prototype.getRuleName = function (rule) {
                var o = this;
                for (var name_1 in o) {
                    if (o[name_1] === rule) {
                        return name_1;
                    }
                }
                throw new Error("Unknown rule");
            };
            ///
            /// Contexts
            ///
            Rules.IsForContext = function (context) {
                return context.contextNode.kind === 202 /* ForStatement */;
            };
            Rules.IsNotForContext = function (context) {
                return !Rules.IsForContext(context);
            };
            Rules.IsBinaryOpContext = function (context) {
                switch (context.contextNode.kind) {
                    case 184 /* BinaryExpression */:
                    case 185 /* ConditionalExpression */:
                    case 192 /* AsExpression */:
                    case 151 /* TypePredicate */:
                    case 159 /* UnionType */:
                    case 160 /* IntersectionType */:
                        return true;
                    // equals in binding elements: function foo([[x, y] = [1, 2]])
                    case 166 /* BindingElement */:
                    // equals in type X = ...
                    case 219 /* TypeAliasDeclaration */:
                    // equal in import a = module('a');
                    case 224 /* ImportEqualsDeclaration */:
                    // equal in let a = 0;
                    case 214 /* VariableDeclaration */:
                    // equal in p = 0;
                    case 139 /* Parameter */:
                    case 250 /* EnumMember */:
                    case 142 /* PropertyDeclaration */:
                    case 141 /* PropertySignature */:
                        return context.currentTokenSpan.kind === 56 /* EqualsToken */ || context.nextTokenSpan.kind === 56 /* EqualsToken */;
                    // "in" keyword in for (let x in []) { }
                    case 203 /* ForInStatement */:
                        return context.currentTokenSpan.kind === 90 /* InKeyword */ || context.nextTokenSpan.kind === 90 /* InKeyword */;
                    // Technically, "of" is not a binary operator, but format it the same way as "in"
                    case 204 /* ForOfStatement */:
                        return context.currentTokenSpan.kind === 135 /* OfKeyword */ || context.nextTokenSpan.kind === 135 /* OfKeyword */;
                }
                return false;
            };
            Rules.IsNotBinaryOpContext = function (context) {
                return !Rules.IsBinaryOpContext(context);
            };
            Rules.IsConditionalOperatorContext = function (context) {
                return context.contextNode.kind === 185 /* ConditionalExpression */;
            };
            Rules.IsSameLineTokenOrBeforeMultilineBlockContext = function (context) {
                //// This check is mainly used inside SpaceBeforeOpenBraceInControl and SpaceBeforeOpenBraceInFunction.
                ////
                //// Ex: 
                //// if (1)     { ....
                ////      * ) and { are on the same line so apply the rule. Here we don't care whether it's same or multi block context
                ////
                //// Ex: 
                //// if (1)
                //// { ... }
                ////      * ) and { are on differnet lines. We only need to format if the block is multiline context. So in this case we don't format.
                ////
                //// Ex:
                //// if (1) 
                //// { ...
                //// }
                ////      * ) and { are on differnet lines. We only need to format if the block is multiline context. So in this case we format.
                return context.TokensAreOnSameLine() || Rules.IsBeforeMultilineBlockContext(context);
            };
            // This check is done before an open brace in a control construct, a function, or a typescript block declaration
            Rules.IsBeforeMultilineBlockContext = function (context) {
                return Rules.IsBeforeBlockContext(context) && !(context.NextNodeAllOnSameLine() || context.NextNodeBlockIsOnOneLine());
            };
            Rules.IsMultilineBlockContext = function (context) {
                return Rules.IsBlockContext(context) && !(context.ContextNodeAllOnSameLine() || context.ContextNodeBlockIsOnOneLine());
            };
            Rules.IsSingleLineBlockContext = function (context) {
                return Rules.IsBlockContext(context) && (context.ContextNodeAllOnSameLine() || context.ContextNodeBlockIsOnOneLine());
            };
            Rules.IsBlockContext = function (context) {
                return Rules.NodeIsBlockContext(context.contextNode);
            };
            Rules.IsBeforeBlockContext = function (context) {
                return Rules.NodeIsBlockContext(context.nextTokenParent);
            };
            // IMPORTANT!!! This method must return true ONLY for nodes with open and close braces as immediate children
            Rules.NodeIsBlockContext = function (node) {
                if (Rules.NodeIsTypeScriptDeclWithBlockContext(node)) {
                    // This means we are in a context that looks like a block to the user, but in the grammar is actually not a node (it's a class, module, enum, object type literal, etc).
                    return true;
                }
                switch (node.kind) {
                    case 195 /* Block */:
                    case 223 /* CaseBlock */:
                    case 168 /* ObjectLiteralExpression */:
                    case 222 /* ModuleBlock */:
                        return true;
                }
                return false;
            };
            Rules.IsFunctionDeclContext = function (context) {
                switch (context.contextNode.kind) {
                    case 216 /* FunctionDeclaration */:
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                    //case SyntaxKind.MemberFunctionDeclaration:
                    case 146 /* GetAccessor */:
                    case 147 /* SetAccessor */:
                    ///case SyntaxKind.MethodSignature:
                    case 148 /* CallSignature */:
                    case 176 /* FunctionExpression */:
                    case 145 /* Constructor */:
                    case 177 /* ArrowFunction */:
                    //case SyntaxKind.ConstructorDeclaration:
                    //case SyntaxKind.SimpleArrowFunctionExpression:
                    //case SyntaxKind.ParenthesizedArrowFunctionExpression:
                    case 218 /* InterfaceDeclaration */:
                        return true;
                }
                return false;
            };
            Rules.IsFunctionDeclarationOrFunctionExpressionContext = function (context) {
                return context.contextNode.kind === 216 /* FunctionDeclaration */ || context.contextNode.kind === 176 /* FunctionExpression */;
            };
            Rules.IsTypeScriptDeclWithBlockContext = function (context) {
                return Rules.NodeIsTypeScriptDeclWithBlockContext(context.contextNode);
            };
            Rules.NodeIsTypeScriptDeclWithBlockContext = function (node) {
                switch (node.kind) {
                    case 217 /* ClassDeclaration */:
                    case 189 /* ClassExpression */:
                    case 218 /* InterfaceDeclaration */:
                    case 220 /* EnumDeclaration */:
                    case 156 /* TypeLiteral */:
                    case 221 /* ModuleDeclaration */:
                        return true;
                }
                return false;
            };
            Rules.IsAfterCodeBlockContext = function (context) {
                switch (context.currentTokenParent.kind) {
                    case 217 /* ClassDeclaration */:
                    case 221 /* ModuleDeclaration */:
                    case 220 /* EnumDeclaration */:
                    case 195 /* Block */:
                    case 247 /* CatchClause */:
                    case 222 /* ModuleBlock */:
                    case 209 /* SwitchStatement */:
                        return true;
                }
                return false;
            };
            Rules.IsControlDeclContext = function (context) {
                switch (context.contextNode.kind) {
                    case 199 /* IfStatement */:
                    case 209 /* SwitchStatement */:
                    case 202 /* ForStatement */:
                    case 203 /* ForInStatement */:
                    case 204 /* ForOfStatement */:
                    case 201 /* WhileStatement */:
                    case 212 /* TryStatement */:
                    case 200 /* DoStatement */:
                    case 208 /* WithStatement */:
                    // TODO
                    // case SyntaxKind.ElseClause:
                    case 247 /* CatchClause */:
                        return true;
                    default:
                        return false;
                }
            };
            Rules.IsObjectContext = function (context) {
                return context.contextNode.kind === 168 /* ObjectLiteralExpression */;
            };
            Rules.IsFunctionCallContext = function (context) {
                return context.contextNode.kind === 171 /* CallExpression */;
            };
            Rules.IsNewContext = function (context) {
                return context.contextNode.kind === 172 /* NewExpression */;
            };
            Rules.IsFunctionCallOrNewContext = function (context) {
                return Rules.IsFunctionCallContext(context) || Rules.IsNewContext(context);
            };
            Rules.IsPreviousTokenNotComma = function (context) {
                return context.currentTokenSpan.kind !== 24 /* CommaToken */;
            };
            Rules.IsNextTokenNotCloseBracket = function (context) {
                return context.nextTokenSpan.kind !== 20 /* CloseBracketToken */;
            };
            Rules.IsArrowFunctionContext = function (context) {
                return context.contextNode.kind === 177 /* ArrowFunction */;
            };
            Rules.IsSameLineTokenContext = function (context) {
                return context.TokensAreOnSameLine();
            };
            Rules.IsNotBeforeBlockInFunctionDeclarationContext = function (context) {
                return !Rules.IsFunctionDeclContext(context) && !Rules.IsBeforeBlockContext(context);
            };
            Rules.IsEndOfDecoratorContextOnSameLine = function (context) {
                return context.TokensAreOnSameLine() &&
                    context.contextNode.decorators &&
                    Rules.NodeIsInDecoratorContext(context.currentTokenParent) &&
                    !Rules.NodeIsInDecoratorContext(context.nextTokenParent);
            };
            Rules.NodeIsInDecoratorContext = function (node) {
                while (ts.isExpression(node)) {
                    node = node.parent;
                }
                return node.kind === 140 /* Decorator */;
            };
            Rules.IsStartOfVariableDeclarationList = function (context) {
                return context.currentTokenParent.kind === 215 /* VariableDeclarationList */ &&
                    context.currentTokenParent.getStart(context.sourceFile) === context.currentTokenSpan.pos;
            };
            Rules.IsNotFormatOnEnter = function (context) {
                return context.formattingRequestKind !== 2 /* FormatOnEnter */;
            };
            Rules.IsModuleDeclContext = function (context) {
                return context.contextNode.kind === 221 /* ModuleDeclaration */;
            };
            Rules.IsObjectTypeContext = function (context) {
                return context.contextNode.kind === 156 /* TypeLiteral */; // && context.contextNode.parent.kind !== SyntaxKind.InterfaceDeclaration;
            };
            Rules.IsTypeArgumentOrParameterOrAssertion = function (token, parent) {
                if (token.kind !== 25 /* LessThanToken */ && token.kind !== 27 /* GreaterThanToken */) {
                    return false;
                }
                switch (parent.kind) {
                    case 152 /* TypeReference */:
                    case 174 /* TypeAssertionExpression */:
                    case 217 /* ClassDeclaration */:
                    case 189 /* ClassExpression */:
                    case 218 /* InterfaceDeclaration */:
                    case 216 /* FunctionDeclaration */:
                    case 176 /* FunctionExpression */:
                    case 177 /* ArrowFunction */:
                    case 144 /* MethodDeclaration */:
                    case 143 /* MethodSignature */:
                    case 148 /* CallSignature */:
                    case 149 /* ConstructSignature */:
                    case 171 /* CallExpression */:
                    case 172 /* NewExpression */:
                    case 191 /* ExpressionWithTypeArguments */:
                        return true;
                    default:
                        return false;
                }
            };
            Rules.IsTypeArgumentOrParameterOrAssertionContext = function (context) {
                return Rules.IsTypeArgumentOrParameterOrAssertion(context.currentTokenSpan, context.currentTokenParent) ||
                    Rules.IsTypeArgumentOrParameterOrAssertion(context.nextTokenSpan, context.nextTokenParent);
            };
            Rules.IsTypeAssertionContext = function (context) {
                return context.contextNode.kind === 174 /* TypeAssertionExpression */;
            };
            Rules.IsVoidOpContext = function (context) {
                return context.currentTokenSpan.kind === 103 /* VoidKeyword */ && context.currentTokenParent.kind === 180 /* VoidExpression */;
            };
            Rules.IsYieldOrYieldStarWithOperand = function (context) {
                return context.contextNode.kind === 187 /* YieldExpression */ && context.contextNode.expression !== undefined;
            };
            return Rules;
        }());
        formatting.Rules = Rules;
    })(formatting = ts.formatting || (ts.formatting = {}));
})(ts || (ts = {}));
