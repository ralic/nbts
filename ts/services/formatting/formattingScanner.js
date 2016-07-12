/// <reference path="formatting.ts"/>
/// <reference path="..\..\compiler\scanner.ts"/>
/* @internal */
var ts;
(function (ts) {
    var formatting;
    (function (formatting) {
        var standardScanner = ts.createScanner(2 /* Latest */, /*skipTrivia*/ false, 0 /* Standard */);
        var jsxScanner = ts.createScanner(2 /* Latest */, /*skipTrivia*/ false, 1 /* JSX */);
        /**
         * Scanner that is currently used for formatting
         */
        var scanner;
        function getFormattingScanner(sourceFile, startPos, endPos) {
            ts.Debug.assert(scanner === undefined);
            scanner = sourceFile.languageVariant === 1 /* JSX */ ? jsxScanner : standardScanner;
            scanner.setText(sourceFile.text);
            scanner.setTextPos(startPos);
            var wasNewLine = true;
            var leadingTrivia;
            var trailingTrivia;
            var savedPos;
            var lastScanAction;
            var lastTokenInfo;
            return {
                advance: advance,
                readTokenInfo: readTokenInfo,
                isOnToken: isOnToken,
                getCurrentLeadingTrivia: function () { return leadingTrivia; },
                lastTrailingTriviaWasNewLine: function () { return wasNewLine; },
                close: function () {
                    ts.Debug.assert(scanner !== undefined);
                    lastTokenInfo = undefined;
                    scanner.setText(undefined);
                    scanner = undefined;
                }
            };
            function advance() {
                ts.Debug.assert(scanner !== undefined);
                lastTokenInfo = undefined;
                var isStarted = scanner.getStartPos() !== startPos;
                if (isStarted) {
                    if (trailingTrivia) {
                        ts.Debug.assert(trailingTrivia.length !== 0);
                        wasNewLine = ts.lastOrUndefined(trailingTrivia).kind === 4 /* NewLineTrivia */;
                    }
                    else {
                        wasNewLine = false;
                    }
                }
                leadingTrivia = undefined;
                trailingTrivia = undefined;
                if (!isStarted) {
                    scanner.scan();
                }
                var t;
                var pos = scanner.getStartPos();
                // Read leading trivia and token
                while (pos < endPos) {
                    var t_1 = scanner.getToken();
                    if (!ts.isTrivia(t_1)) {
                        break;
                    }
                    // consume leading trivia
                    scanner.scan();
                    var item = {
                        pos: pos,
                        end: scanner.getStartPos(),
                        kind: t_1
                    };
                    pos = scanner.getStartPos();
                    if (!leadingTrivia) {
                        leadingTrivia = [];
                    }
                    leadingTrivia.push(item);
                }
                savedPos = scanner.getStartPos();
            }
            function shouldRescanGreaterThanToken(node) {
                if (node) {
                    switch (node.kind) {
                        case 29 /* GreaterThanEqualsToken */:
                        case 64 /* GreaterThanGreaterThanEqualsToken */:
                        case 65 /* GreaterThanGreaterThanGreaterThanEqualsToken */:
                        case 45 /* GreaterThanGreaterThanGreaterThanToken */:
                        case 44 /* GreaterThanGreaterThanToken */:
                            return true;
                    }
                }
                return false;
            }
            function shouldRescanJsxIdentifier(node) {
                if (node.parent) {
                    switch (node.parent.kind) {
                        case 241 /* JsxAttribute */:
                        case 238 /* JsxOpeningElement */:
                        case 240 /* JsxClosingElement */:
                        case 237 /* JsxSelfClosingElement */:
                            return node.kind === 69 /* Identifier */;
                    }
                }
                return false;
            }
            function shouldRescanSlashToken(container) {
                return container.kind === 10 /* RegularExpressionLiteral */;
            }
            function shouldRescanTemplateToken(container) {
                return container.kind === 13 /* TemplateMiddle */ ||
                    container.kind === 14 /* TemplateTail */;
            }
            function startsWithSlashToken(t) {
                return t === 39 /* SlashToken */ || t === 61 /* SlashEqualsToken */;
            }
            function readTokenInfo(n) {
                ts.Debug.assert(scanner !== undefined);
                if (!isOnToken()) {
                    // scanner is not on the token (either advance was not called yet or scanner is already past the end position)
                    return {
                        leadingTrivia: leadingTrivia,
                        trailingTrivia: undefined,
                        token: undefined
                    };
                }
                // normally scanner returns the smallest available token
                // check the kind of context node to determine if scanner should have more greedy behavior and consume more text.
                var expectedScanAction = shouldRescanGreaterThanToken(n)
                    ? 1 /* RescanGreaterThanToken */
                    : shouldRescanSlashToken(n)
                        ? 2 /* RescanSlashToken */
                        : shouldRescanTemplateToken(n)
                            ? 3 /* RescanTemplateToken */
                            : shouldRescanJsxIdentifier(n)
                                ? 4 /* RescanJsxIdentifier */
                                : 0 /* Scan */;
                if (lastTokenInfo && expectedScanAction === lastScanAction) {
                    // readTokenInfo was called before with the same expected scan action.
                    // No need to re-scan text, return existing 'lastTokenInfo'
                    // it is ok to call fixTokenKind here since it does not affect
                    // what portion of text is consumed. In opposize rescanning can change it,
                    // i.e. for '>=' when originally scanner eats just one character
                    // and rescanning forces it to consume more.
                    return fixTokenKind(lastTokenInfo, n);
                }
                if (scanner.getStartPos() !== savedPos) {
                    ts.Debug.assert(lastTokenInfo !== undefined);
                    // readTokenInfo was called before but scan action differs - rescan text
                    scanner.setTextPos(savedPos);
                    scanner.scan();
                }
                var currentToken = scanner.getToken();
                if (expectedScanAction === 1 /* RescanGreaterThanToken */ && currentToken === 27 /* GreaterThanToken */) {
                    currentToken = scanner.reScanGreaterToken();
                    ts.Debug.assert(n.kind === currentToken);
                    lastScanAction = 1 /* RescanGreaterThanToken */;
                }
                else if (expectedScanAction === 2 /* RescanSlashToken */ && startsWithSlashToken(currentToken)) {
                    currentToken = scanner.reScanSlashToken();
                    ts.Debug.assert(n.kind === currentToken);
                    lastScanAction = 2 /* RescanSlashToken */;
                }
                else if (expectedScanAction === 3 /* RescanTemplateToken */ && currentToken === 16 /* CloseBraceToken */) {
                    currentToken = scanner.reScanTemplateToken();
                    lastScanAction = 3 /* RescanTemplateToken */;
                }
                else if (expectedScanAction === 4 /* RescanJsxIdentifier */ && currentToken === 69 /* Identifier */) {
                    currentToken = scanner.scanJsxIdentifier();
                    lastScanAction = 4 /* RescanJsxIdentifier */;
                }
                else {
                    lastScanAction = 0 /* Scan */;
                }
                var token = {
                    pos: scanner.getStartPos(),
                    end: scanner.getTextPos(),
                    kind: currentToken
                };
                // consume trailing trivia
                if (trailingTrivia) {
                    trailingTrivia = undefined;
                }
                while (scanner.getStartPos() < endPos) {
                    currentToken = scanner.scan();
                    if (!ts.isTrivia(currentToken)) {
                        break;
                    }
                    var trivia = {
                        pos: scanner.getStartPos(),
                        end: scanner.getTextPos(),
                        kind: currentToken
                    };
                    if (!trailingTrivia) {
                        trailingTrivia = [];
                    }
                    trailingTrivia.push(trivia);
                    if (currentToken === 4 /* NewLineTrivia */) {
                        // move past new line
                        scanner.scan();
                        break;
                    }
                }
                lastTokenInfo = {
                    leadingTrivia: leadingTrivia,
                    trailingTrivia: trailingTrivia,
                    token: token
                };
                return fixTokenKind(lastTokenInfo, n);
            }
            function isOnToken() {
                ts.Debug.assert(scanner !== undefined);
                var current = (lastTokenInfo && lastTokenInfo.token.kind) || scanner.getToken();
                var startPos = (lastTokenInfo && lastTokenInfo.token.pos) || scanner.getStartPos();
                return startPos < endPos && current !== 1 /* EndOfFileToken */ && !ts.isTrivia(current);
            }
            // when containing node in the tree is token 
            // but its kind differs from the kind that was returned by the scanner,
            // then kind needs to be fixed. This might happen in cases 
            // when parser interprets token differently, i.e keyword treated as identifier
            function fixTokenKind(tokenInfo, container) {
                if (ts.isToken(container) && tokenInfo.token.kind !== container.kind) {
                    tokenInfo.token.kind = container.kind;
                }
                return tokenInfo;
            }
        }
        formatting.getFormattingScanner = getFormattingScanner;
    })(formatting = ts.formatting || (ts.formatting = {}));
})(ts || (ts = {}));
