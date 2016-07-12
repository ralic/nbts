/// <reference path="sys.ts" />
/// <reference path="emitter.ts" />
/// <reference path="core.ts" />
var ts;
(function (ts) {
    /* @internal */ ts.programTime = 0;
    /* @internal */ ts.emitTime = 0;
    /* @internal */ ts.ioReadTime = 0;
    /* @internal */ ts.ioWriteTime = 0;
    /** The version of the TypeScript compiler release */
    var emptyArray = [];
    ts.version = "1.8.5";
    function findConfigFile(searchPath, fileExists) {
        var fileName = "tsconfig.json";
        while (true) {
            if (fileExists(fileName)) {
                return fileName;
            }
            var parentPath = ts.getDirectoryPath(searchPath);
            if (parentPath === searchPath) {
                break;
            }
            searchPath = parentPath;
            fileName = "../" + fileName;
        }
        return undefined;
    }
    ts.findConfigFile = findConfigFile;
    function resolveTripleslashReference(moduleName, containingFile) {
        var basePath = ts.getDirectoryPath(containingFile);
        var referencedFileName = ts.isRootedDiskPath(moduleName) ? moduleName : ts.combinePaths(basePath, moduleName);
        return ts.normalizePath(referencedFileName);
    }
    ts.resolveTripleslashReference = resolveTripleslashReference;
    function resolveModuleName(moduleName, containingFile, compilerOptions, host) {
        var moduleResolution = compilerOptions.moduleResolution !== undefined
            ? compilerOptions.moduleResolution
            : ts.getEmitModuleKind(compilerOptions) === 1 /* CommonJS */ ? 2 /* NodeJs */ : 1 /* Classic */;
        switch (moduleResolution) {
            case 2 /* NodeJs */: return nodeModuleNameResolver(moduleName, containingFile, compilerOptions, host);
            case 1 /* Classic */: return classicNameResolver(moduleName, containingFile, compilerOptions, host);
        }
    }
    ts.resolveModuleName = resolveModuleName;
    function nodeModuleNameResolver(moduleName, containingFile, compilerOptions, host) {
        var containingDirectory = ts.getDirectoryPath(containingFile);
        var supportedExtensions = ts.getSupportedExtensions(compilerOptions);
        if (ts.getRootLength(moduleName) !== 0 || nameStartsWithDotSlashOrDotDotSlash(moduleName)) {
            var failedLookupLocations = [];
            var candidate = ts.normalizePath(ts.combinePaths(containingDirectory, moduleName));
            var resolvedFileName = loadNodeModuleFromFile(supportedExtensions, candidate, failedLookupLocations, /*onlyRecordFailures*/ false, host);
            if (resolvedFileName) {
                return { resolvedModule: { resolvedFileName: resolvedFileName }, failedLookupLocations: failedLookupLocations };
            }
            resolvedFileName = loadNodeModuleFromDirectory(supportedExtensions, candidate, failedLookupLocations, /*onlyRecordFailures*/ false, host);
            return resolvedFileName
                ? { resolvedModule: { resolvedFileName: resolvedFileName }, failedLookupLocations: failedLookupLocations }
                : { resolvedModule: undefined, failedLookupLocations: failedLookupLocations };
        }
        else {
            return loadModuleFromNodeModules(moduleName, containingDirectory, host);
        }
    }
    ts.nodeModuleNameResolver = nodeModuleNameResolver;
    /* @internal */
    function directoryProbablyExists(directoryName, host) {
        // if host does not support 'directoryExists' assume that directory will exist
        return !host.directoryExists || host.directoryExists(directoryName);
    }
    ts.directoryProbablyExists = directoryProbablyExists;
    /**
     * @param {boolean} onlyRecordFailures - if true then function won't try to actually load files but instead record all attempts as failures. This flag is necessary
     * in cases when we know upfront that all load attempts will fail (because containing folder does not exists) however we still need to record all failed lookup locations.
     */
    function loadNodeModuleFromFile(extensions, candidate, failedLookupLocation, onlyRecordFailures, host) {
        return ts.forEach(extensions, tryLoad);
        function tryLoad(ext) {
            var fileName = ts.fileExtensionIs(candidate, ext) ? candidate : candidate + ext;
            if (!onlyRecordFailures && host.fileExists(fileName)) {
                return fileName;
            }
            else {
                failedLookupLocation.push(fileName);
                return undefined;
            }
        }
    }
    function loadNodeModuleFromDirectory(extensions, candidate, failedLookupLocation, onlyRecordFailures, host) {
        var packageJsonPath = ts.combinePaths(candidate, "package.json");
        var directoryExists = !onlyRecordFailures && directoryProbablyExists(candidate, host);
        if (directoryExists && host.fileExists(packageJsonPath)) {
            var jsonContent = void 0;
            try {
                var jsonText = host.readFile(packageJsonPath);
                jsonContent = jsonText ? JSON.parse(jsonText) : { typings: undefined };
            }
            catch (e) {
                // gracefully handle if readFile fails or returns not JSON 
                jsonContent = { typings: undefined };
            }
            if (typeof jsonContent.typings === "string") {
                var path = ts.normalizePath(ts.combinePaths(candidate, jsonContent.typings));
                var result = loadNodeModuleFromFile(extensions, path, failedLookupLocation, !directoryProbablyExists(ts.getDirectoryPath(path), host), host);
                if (result) {
                    return result;
                }
            }
        }
        else {
            // record package json as one of failed lookup locations - in the future if this file will appear it will invalidate resolution results
            failedLookupLocation.push(packageJsonPath);
        }
        return loadNodeModuleFromFile(extensions, ts.combinePaths(candidate, "index"), failedLookupLocation, !directoryExists, host);
    }
    function loadModuleFromNodeModules(moduleName, directory, host) {
        var failedLookupLocations = [];
        directory = ts.normalizeSlashes(directory);
        while (true) {
            var baseName = ts.getBaseFileName(directory);
            if (baseName !== "node_modules") {
                var nodeModulesFolder = ts.combinePaths(directory, "node_modules");
                var nodeModulesFolderExists = directoryProbablyExists(nodeModulesFolder, host);
                var candidate = ts.normalizePath(ts.combinePaths(nodeModulesFolder, moduleName));
                // Load only typescript files irrespective of allowJs option if loading from node modules
                var result = loadNodeModuleFromFile(ts.supportedTypeScriptExtensions, candidate, failedLookupLocations, !nodeModulesFolderExists, host);
                if (result) {
                    return { resolvedModule: { resolvedFileName: result, isExternalLibraryImport: true }, failedLookupLocations: failedLookupLocations };
                }
                result = loadNodeModuleFromDirectory(ts.supportedTypeScriptExtensions, candidate, failedLookupLocations, !nodeModulesFolderExists, host);
                if (result) {
                    return { resolvedModule: { resolvedFileName: result, isExternalLibraryImport: true }, failedLookupLocations: failedLookupLocations };
                }
            }
            var parentPath = ts.getDirectoryPath(directory);
            if (parentPath === directory) {
                break;
            }
            directory = parentPath;
        }
        return { resolvedModule: undefined, failedLookupLocations: failedLookupLocations };
    }
    function nameStartsWithDotSlashOrDotDotSlash(name) {
        var i = name.lastIndexOf("./", 1);
        return i === 0 || (i === 1 && name.charCodeAt(0) === 46 /* dot */);
    }
    function classicNameResolver(moduleName, containingFile, compilerOptions, host) {
        // module names that contain '!' are used to reference resources and are not resolved to actual files on disk
        if (moduleName.indexOf("!") != -1) {
            return { resolvedModule: undefined, failedLookupLocations: [] };
        }
        var searchPath = ts.getDirectoryPath(containingFile);
        var searchName;
        var failedLookupLocations = [];
        var referencedSourceFile;
        var supportedExtensions = ts.getSupportedExtensions(compilerOptions);
        while (true) {
            searchName = ts.normalizePath(ts.combinePaths(searchPath, moduleName));
            referencedSourceFile = ts.forEach(supportedExtensions, function (extension) {
                if (extension === ".tsx" && !compilerOptions.jsx) {
                    // resolve .tsx files only if jsx support is enabled 
                    // 'logical not' handles both undefined and None cases
                    return undefined;
                }
                var candidate = searchName + extension;
                if (host.fileExists(candidate)) {
                    return candidate;
                }
                else {
                    failedLookupLocations.push(candidate);
                }
            });
            if (referencedSourceFile) {
                break;
            }
            var parentPath = ts.getDirectoryPath(searchPath);
            if (parentPath === searchPath) {
                break;
            }
            searchPath = parentPath;
        }
        return referencedSourceFile
            ? { resolvedModule: { resolvedFileName: referencedSourceFile }, failedLookupLocations: failedLookupLocations }
            : { resolvedModule: undefined, failedLookupLocations: failedLookupLocations };
    }
    ts.classicNameResolver = classicNameResolver;
    /* @internal */
    ts.defaultInitCompilerOptions = {
        module: 1 /* CommonJS */,
        target: 1 /* ES5 */,
        noImplicitAny: false,
        sourceMap: false
    };
    function createCompilerHost(options, setParentNodes) {
        var existingDirectories = {};
        function getCanonicalFileName(fileName) {
            // if underlying system can distinguish between two files whose names differs only in cases then file name already in canonical form.
            // otherwise use toLowerCase as a canonical form.
            return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
        }
        // returned by CScript sys environment
        var unsupportedFileEncodingErrorCode = -2147024809;
        function getSourceFile(fileName, languageVersion, onError) {
            var text;
            try {
                var start = new Date().getTime();
                text = ts.sys.readFile(fileName, options.charset);
                ts.ioReadTime += new Date().getTime() - start;
            }
            catch (e) {
                if (onError) {
                    onError(e.number === unsupportedFileEncodingErrorCode
                        ? ts.createCompilerDiagnostic(ts.Diagnostics.Unsupported_file_encoding).messageText
                        : e.message);
                }
                text = "";
            }
            return text !== undefined ? ts.createSourceFile(fileName, text, languageVersion, setParentNodes) : undefined;
        }
        function directoryExists(directoryPath) {
            if (ts.hasProperty(existingDirectories, directoryPath)) {
                return true;
            }
            if (ts.sys.directoryExists(directoryPath)) {
                existingDirectories[directoryPath] = true;
                return true;
            }
            return false;
        }
        function ensureDirectoriesExist(directoryPath) {
            if (directoryPath.length > ts.getRootLength(directoryPath) && !directoryExists(directoryPath)) {
                var parentDirectory = ts.getDirectoryPath(directoryPath);
                ensureDirectoriesExist(parentDirectory);
                ts.sys.createDirectory(directoryPath);
            }
        }
        function writeFile(fileName, data, writeByteOrderMark, onError) {
            try {
                var start = new Date().getTime();
                ensureDirectoriesExist(ts.getDirectoryPath(ts.normalizePath(fileName)));
                ts.sys.writeFile(fileName, data, writeByteOrderMark);
                ts.ioWriteTime += new Date().getTime() - start;
            }
            catch (e) {
                if (onError) {
                    onError(e.message);
                }
            }
        }
        var newLine = ts.getNewLineCharacter(options);
        return {
            getSourceFile: getSourceFile,
            getDefaultLibFileName: function (options) { return ts.combinePaths(ts.getDirectoryPath(ts.normalizePath(ts.sys.getExecutingFilePath())), ts.getDefaultLibFileName(options)); },
            writeFile: writeFile,
            getCurrentDirectory: ts.memoize(function () { return ts.sys.getCurrentDirectory(); }),
            useCaseSensitiveFileNames: function () { return ts.sys.useCaseSensitiveFileNames; },
            getCanonicalFileName: getCanonicalFileName,
            getNewLine: function () { return newLine; },
            fileExists: function (fileName) { return ts.sys.fileExists(fileName); },
            readFile: function (fileName) { return ts.sys.readFile(fileName); },
            directoryExists: function (directoryName) { return ts.sys.directoryExists(directoryName); }
        };
    }
    ts.createCompilerHost = createCompilerHost;
    function getPreEmitDiagnostics(program, sourceFile, cancellationToken) {
        var diagnostics = program.getOptionsDiagnostics(cancellationToken).concat(program.getSyntacticDiagnostics(sourceFile, cancellationToken), program.getGlobalDiagnostics(cancellationToken), program.getSemanticDiagnostics(sourceFile, cancellationToken));
        if (program.getCompilerOptions().declaration) {
            diagnostics = diagnostics.concat(program.getDeclarationDiagnostics(sourceFile, cancellationToken));
        }
        return ts.sortAndDeduplicateDiagnostics(diagnostics);
    }
    ts.getPreEmitDiagnostics = getPreEmitDiagnostics;
    function flattenDiagnosticMessageText(messageText, newLine) {
        if (typeof messageText === "string") {
            return messageText;
        }
        else {
            var diagnosticChain = messageText;
            var result = "";
            var indent = 0;
            while (diagnosticChain) {
                if (indent) {
                    result += newLine;
                    for (var i = 0; i < indent; i++) {
                        result += "  ";
                    }
                }
                result += diagnosticChain.messageText;
                indent++;
                diagnosticChain = diagnosticChain.next;
            }
            return result;
        }
    }
    ts.flattenDiagnosticMessageText = flattenDiagnosticMessageText;
    function createProgram(rootNames, options, host, oldProgram) {
        var program;
        var files = [];
        var fileProcessingDiagnostics = ts.createDiagnosticCollection();
        var programDiagnostics = ts.createDiagnosticCollection();
        var commonSourceDirectory;
        var diagnosticsProducingTypeChecker;
        var noDiagnosticsTypeChecker;
        var classifiableNames;
        var skipDefaultLib = options.noLib;
        var supportedExtensions = ts.getSupportedExtensions(options);
        var start = new Date().getTime();
        host = host || createCompilerHost(options);
        // Map storing if there is emit blocking diagnostics for given input
        var hasEmitBlockingDiagnostics = ts.createFileMap(getCanonicalFileName);
        var currentDirectory = host.getCurrentDirectory();
        var resolveModuleNamesWorker = host.resolveModuleNames
            ? (function (moduleNames, containingFile) { return host.resolveModuleNames(moduleNames, containingFile); })
            : (function (moduleNames, containingFile) {
                var resolvedModuleNames = [];
                // resolveModuleName does not store any results between calls.
                // lookup is a local cache to avoid resolving the same module name several times
                var lookup = {};
                for (var _i = 0, moduleNames_1 = moduleNames; _i < moduleNames_1.length; _i++) {
                    var moduleName = moduleNames_1[_i];
                    var resolvedName = void 0;
                    if (ts.hasProperty(lookup, moduleName)) {
                        resolvedName = lookup[moduleName];
                    }
                    else {
                        resolvedName = resolveModuleName(moduleName, containingFile, options, host).resolvedModule;
                        lookup[moduleName] = resolvedName;
                    }
                    resolvedModuleNames.push(resolvedName);
                }
                return resolvedModuleNames;
            });
        var filesByName = ts.createFileMap();
        // stores 'filename -> file association' ignoring case
        // used to track cases when two file names differ only in casing 
        var filesByNameIgnoreCase = host.useCaseSensitiveFileNames() ? ts.createFileMap(function (fileName) { return fileName.toLowerCase(); }) : undefined;
        if (oldProgram) {
            // check properties that can affect structure of the program or module resolution strategy
            // if any of these properties has changed - structure cannot be reused
            var oldOptions = oldProgram.getCompilerOptions();
            if ((oldOptions.module !== options.module) ||
                (oldOptions.noResolve !== options.noResolve) ||
                (oldOptions.target !== options.target) ||
                (oldOptions.noLib !== options.noLib) ||
                (oldOptions.jsx !== options.jsx) ||
                (oldOptions.allowJs !== options.allowJs)) {
                oldProgram = undefined;
            }
        }
        if (!tryReuseStructureFromOldProgram()) {
            ts.forEach(rootNames, function (name) { return processRootFile(name, /*isDefaultLib*/ false); });
            // Do not process the default library if:
            //  - The '--noLib' flag is used.
            //  - A 'no-default-lib' reference comment is encountered in
            //      processing the root files.
            if (!skipDefaultLib) {
                processRootFile(host.getDefaultLibFileName(options), /*isDefaultLib*/ true);
            }
        }
        // unconditionally set oldProgram to undefined to prevent it from being captured in closure
        oldProgram = undefined;
        program = {
            getRootFileNames: function () { return rootNames; },
            getSourceFile: getSourceFile,
            getSourceFiles: function () { return files; },
            getCompilerOptions: function () { return options; },
            getSyntacticDiagnostics: getSyntacticDiagnostics,
            getOptionsDiagnostics: getOptionsDiagnostics,
            getGlobalDiagnostics: getGlobalDiagnostics,
            getSemanticDiagnostics: getSemanticDiagnostics,
            getDeclarationDiagnostics: getDeclarationDiagnostics,
            getTypeChecker: getTypeChecker,
            getClassifiableNames: getClassifiableNames,
            getDiagnosticsProducingTypeChecker: getDiagnosticsProducingTypeChecker,
            getCommonSourceDirectory: getCommonSourceDirectory,
            emit: emit,
            getCurrentDirectory: function () { return currentDirectory; },
            getNodeCount: function () { return getDiagnosticsProducingTypeChecker().getNodeCount(); },
            getIdentifierCount: function () { return getDiagnosticsProducingTypeChecker().getIdentifierCount(); },
            getSymbolCount: function () { return getDiagnosticsProducingTypeChecker().getSymbolCount(); },
            getTypeCount: function () { return getDiagnosticsProducingTypeChecker().getTypeCount(); },
            getFileProcessingDiagnostics: function () { return fileProcessingDiagnostics; }
        };
        verifyCompilerOptions();
        ts.programTime += new Date().getTime() - start;
        return program;
        function getCommonSourceDirectory() {
            if (typeof commonSourceDirectory === "undefined") {
                if (options.rootDir && checkSourceFilesBelongToPath(files, options.rootDir)) {
                    // If a rootDir is specified and is valid use it as the commonSourceDirectory
                    commonSourceDirectory = ts.getNormalizedAbsolutePath(options.rootDir, currentDirectory);
                }
                else {
                    commonSourceDirectory = computeCommonSourceDirectory(files);
                }
                if (commonSourceDirectory && commonSourceDirectory[commonSourceDirectory.length - 1] !== ts.directorySeparator) {
                    // Make sure directory path ends with directory separator so this string can directly
                    // used to replace with "" to get the relative path of the source file and the relative path doesn't
                    // start with / making it rooted path
                    commonSourceDirectory += ts.directorySeparator;
                }
            }
            return commonSourceDirectory;
        }
        function getClassifiableNames() {
            if (!classifiableNames) {
                // Initialize a checker so that all our files are bound.
                getTypeChecker();
                classifiableNames = {};
                for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                    var sourceFile = files_1[_i];
                    ts.copyMap(sourceFile.classifiableNames, classifiableNames);
                }
            }
            return classifiableNames;
        }
        function tryReuseStructureFromOldProgram() {
            if (!oldProgram) {
                return false;
            }
            ts.Debug.assert(!oldProgram.structureIsReused);
            // there is an old program, check if we can reuse its structure
            var oldRootNames = oldProgram.getRootFileNames();
            if (!ts.arrayIsEqualTo(oldRootNames, rootNames)) {
                return false;
            }
            // check if program source files has changed in the way that can affect structure of the program
            var newSourceFiles = [];
            var filePaths = [];
            var modifiedSourceFiles = [];
            for (var _i = 0, _a = oldProgram.getSourceFiles(); _i < _a.length; _i++) {
                var oldSourceFile = _a[_i];
                var newSourceFile = host.getSourceFile(oldSourceFile.fileName, options.target);
                if (!newSourceFile) {
                    return false;
                }
                newSourceFile.path = oldSourceFile.path;
                filePaths.push(newSourceFile.path);
                if (oldSourceFile !== newSourceFile) {
                    if (oldSourceFile.hasNoDefaultLib !== newSourceFile.hasNoDefaultLib) {
                        // value of no-default-lib has changed
                        // this will affect if default library is injected into the list of files
                        return false;
                    }
                    // check tripleslash references
                    if (!ts.arrayIsEqualTo(oldSourceFile.referencedFiles, newSourceFile.referencedFiles, fileReferenceIsEqualTo)) {
                        // tripleslash references has changed
                        return false;
                    }
                    // check imports and module augmentations
                    collectExternalModuleReferences(newSourceFile);
                    if (!ts.arrayIsEqualTo(oldSourceFile.imports, newSourceFile.imports, moduleNameIsEqualTo)) {
                        // imports has changed
                        return false;
                    }
                    if (!ts.arrayIsEqualTo(oldSourceFile.moduleAugmentations, newSourceFile.moduleAugmentations, moduleNameIsEqualTo)) {
                        // moduleAugmentations has changed
                        return false;
                    }
                    if (resolveModuleNamesWorker) {
                        var moduleNames = ts.map(ts.concatenate(newSourceFile.imports, newSourceFile.moduleAugmentations), getTextOfLiteral);
                        var resolutions = resolveModuleNamesWorker(moduleNames, ts.getNormalizedAbsolutePath(newSourceFile.fileName, currentDirectory));
                        // ensure that module resolution results are still correct
                        for (var i = 0; i < moduleNames.length; i++) {
                            var newResolution = resolutions[i];
                            var oldResolution = ts.getResolvedModule(oldSourceFile, moduleNames[i]);
                            var resolutionChanged = oldResolution
                                ? !newResolution ||
                                    oldResolution.resolvedFileName !== newResolution.resolvedFileName ||
                                    !!oldResolution.isExternalLibraryImport !== !!newResolution.isExternalLibraryImport
                                : newResolution;
                            if (resolutionChanged) {
                                return false;
                            }
                        }
                    }
                    // pass the cache of module resolutions from the old source file
                    newSourceFile.resolvedModules = oldSourceFile.resolvedModules;
                    modifiedSourceFiles.push(newSourceFile);
                }
                else {
                    // file has no changes - use it as is
                    newSourceFile = oldSourceFile;
                }
                // if file has passed all checks it should be safe to reuse it
                newSourceFiles.push(newSourceFile);
            }
            // update fileName -> file mapping
            for (var i = 0, len = newSourceFiles.length; i < len; i++) {
                filesByName.set(filePaths[i], newSourceFiles[i]);
            }
            files = newSourceFiles;
            fileProcessingDiagnostics = oldProgram.getFileProcessingDiagnostics();
            for (var _b = 0, modifiedSourceFiles_1 = modifiedSourceFiles; _b < modifiedSourceFiles_1.length; _b++) {
                var modifiedFile = modifiedSourceFiles_1[_b];
                fileProcessingDiagnostics.reattachFileDiagnostics(modifiedFile);
            }
            oldProgram.structureIsReused = true;
            return true;
        }
        function getEmitHost(writeFileCallback) {
            return {
                getCanonicalFileName: getCanonicalFileName,
                getCommonSourceDirectory: program.getCommonSourceDirectory,
                getCompilerOptions: program.getCompilerOptions,
                getCurrentDirectory: function () { return currentDirectory; },
                getNewLine: function () { return host.getNewLine(); },
                getSourceFile: program.getSourceFile,
                getSourceFiles: program.getSourceFiles,
                writeFile: writeFileCallback || (function (fileName, data, writeByteOrderMark, onError) { return host.writeFile(fileName, data, writeByteOrderMark, onError); }),
                isEmitBlocked: isEmitBlocked
            };
        }
        function getDiagnosticsProducingTypeChecker() {
            return diagnosticsProducingTypeChecker || (diagnosticsProducingTypeChecker = ts.createTypeChecker(program, /*produceDiagnostics:*/ true));
        }
        function getTypeChecker() {
            return noDiagnosticsTypeChecker || (noDiagnosticsTypeChecker = ts.createTypeChecker(program, /*produceDiagnostics:*/ false));
        }
        function emit(sourceFile, writeFileCallback, cancellationToken) {
            var _this = this;
            return runWithCancellationToken(function () { return emitWorker(_this, sourceFile, writeFileCallback, cancellationToken); });
        }
        function isEmitBlocked(emitFileName) {
            return hasEmitBlockingDiagnostics.contains(ts.toPath(emitFileName, currentDirectory, getCanonicalFileName));
        }
        function emitWorker(program, sourceFile, writeFileCallback, cancellationToken) {
            // If the noEmitOnError flag is set, then check if we have any errors so far.  If so,
            // immediately bail out.  Note that we pass 'undefined' for 'sourceFile' so that we
            // get any preEmit diagnostics, not just the ones
            if (options.noEmitOnError) {
                var diagnostics = program.getOptionsDiagnostics(cancellationToken).concat(program.getSyntacticDiagnostics(sourceFile, cancellationToken), program.getGlobalDiagnostics(cancellationToken), program.getSemanticDiagnostics(sourceFile, cancellationToken));
                var declarationDiagnostics = [];
                if (diagnostics.length === 0 && program.getCompilerOptions().declaration) {
                    declarationDiagnostics = program.getDeclarationDiagnostics(/*sourceFile*/ undefined, cancellationToken);
                }
                if (diagnostics.length > 0 || declarationDiagnostics.length > 0) {
                    return { diagnostics: declarationDiagnostics, sourceMaps: undefined, emitSkipped: true };
                }
            }
            // Create the emit resolver outside of the "emitTime" tracking code below.  That way
            // any cost associated with it (like type checking) are appropriate associated with
            // the type-checking counter.
            //
            // If the -out option is specified, we should not pass the source file to getEmitResolver.
            // This is because in the -out scenario all files need to be emitted, and therefore all
            // files need to be type checked. And the way to specify that all files need to be type
            // checked is to not pass the file to getEmitResolver.
            var emitResolver = getDiagnosticsProducingTypeChecker().getEmitResolver((options.outFile || options.out) ? undefined : sourceFile);
            var start = new Date().getTime();
            var emitResult = ts.emitFiles(emitResolver, getEmitHost(writeFileCallback), sourceFile);
            ts.emitTime += new Date().getTime() - start;
            return emitResult;
        }
        function getSourceFile(fileName) {
            return filesByName.get(ts.toPath(fileName, currentDirectory, getCanonicalFileName));
        }
        function getDiagnosticsHelper(sourceFile, getDiagnostics, cancellationToken) {
            if (sourceFile) {
                return getDiagnostics(sourceFile, cancellationToken);
            }
            var allDiagnostics = [];
            ts.forEach(program.getSourceFiles(), function (sourceFile) {
                if (cancellationToken) {
                    cancellationToken.throwIfCancellationRequested();
                }
                ts.addRange(allDiagnostics, getDiagnostics(sourceFile, cancellationToken));
            });
            return ts.sortAndDeduplicateDiagnostics(allDiagnostics);
        }
        function getSyntacticDiagnostics(sourceFile, cancellationToken) {
            return getDiagnosticsHelper(sourceFile, getSyntacticDiagnosticsForFile, cancellationToken);
        }
        function getSemanticDiagnostics(sourceFile, cancellationToken) {
            return getDiagnosticsHelper(sourceFile, getSemanticDiagnosticsForFile, cancellationToken);
        }
        function getDeclarationDiagnostics(sourceFile, cancellationToken) {
            var options = program.getCompilerOptions();
            // collect diagnostics from the program only once if either no source file was specified or out/outFile is set (bundled emit)
            if (!sourceFile || options.out || options.outFile) {
                return getDeclarationDiagnosticsWorker(sourceFile, cancellationToken);
            }
            else {
                return getDiagnosticsHelper(sourceFile, getDeclarationDiagnosticsForFile, cancellationToken);
            }
        }
        function getSyntacticDiagnosticsForFile(sourceFile, cancellationToken) {
            return sourceFile.parseDiagnostics;
        }
        function runWithCancellationToken(func) {
            try {
                return func();
            }
            catch (e) {
                if (e instanceof ts.OperationCanceledException) {
                    // We were canceled while performing the operation.  Because our type checker
                    // might be a bad state, we need to throw it away.
                    //
                    // Note: we are overly agressive here.  We do not actually *have* to throw away
                    // the "noDiagnosticsTypeChecker".  However, for simplicity, i'd like to keep
                    // the lifetimes of these two TypeCheckers the same.  Also, we generally only
                    // cancel when the user has made a change anyways.  And, in that case, we (the
                    // program instance) will get thrown away anyways.  So trying to keep one of
                    // these type checkers alive doesn't serve much purpose.
                    noDiagnosticsTypeChecker = undefined;
                    diagnosticsProducingTypeChecker = undefined;
                }
                throw e;
            }
        }
        function getSemanticDiagnosticsForFile(sourceFile, cancellationToken) {
            return runWithCancellationToken(function () {
                var typeChecker = getDiagnosticsProducingTypeChecker();
                ts.Debug.assert(!!sourceFile.bindDiagnostics);
                var bindDiagnostics = sourceFile.bindDiagnostics;
                // For JavaScript files, we don't want to report the normal typescript semantic errors.
                // Instead, we just report errors for using TypeScript-only constructs from within a
                // JavaScript file.
                var checkDiagnostics = ts.isSourceFileJavaScript(sourceFile) ?
                    getJavaScriptSemanticDiagnosticsForFile(sourceFile, cancellationToken) :
                    typeChecker.getDiagnostics(sourceFile, cancellationToken);
                var fileProcessingDiagnosticsInFile = fileProcessingDiagnostics.getDiagnostics(sourceFile.fileName);
                var programDiagnosticsInFile = programDiagnostics.getDiagnostics(sourceFile.fileName);
                return bindDiagnostics.concat(checkDiagnostics).concat(fileProcessingDiagnosticsInFile).concat(programDiagnosticsInFile);
            });
        }
        function getJavaScriptSemanticDiagnosticsForFile(sourceFile, cancellationToken) {
            return runWithCancellationToken(function () {
                var diagnostics = [];
                walk(sourceFile);
                return diagnostics;
                function walk(node) {
                    if (!node) {
                        return false;
                    }
                    switch (node.kind) {
                        case 224 /* ImportEqualsDeclaration */:
                            diagnostics.push(ts.createDiagnosticForNode(node, ts.Diagnostics.import_can_only_be_used_in_a_ts_file));
                            return true;
                        case 230 /* ExportAssignment */:
                            if (node.isExportEquals) {
                                diagnostics.push(ts.createDiagnosticForNode(node, ts.Diagnostics.export_can_only_be_used_in_a_ts_file));
                                return true;
                            }
                            break;
                        case 217 /* ClassDeclaration */:
                            var classDeclaration = node;
                            if (checkModifiers(classDeclaration.modifiers) ||
                                checkTypeParameters(classDeclaration.typeParameters)) {
                                return true;
                            }
                            break;
                        case 246 /* HeritageClause */:
                            var heritageClause = node;
                            if (heritageClause.token === 106 /* ImplementsKeyword */) {
                                diagnostics.push(ts.createDiagnosticForNode(node, ts.Diagnostics.implements_clauses_can_only_be_used_in_a_ts_file));
                                return true;
                            }
                            break;
                        case 218 /* InterfaceDeclaration */:
                            diagnostics.push(ts.createDiagnosticForNode(node, ts.Diagnostics.interface_declarations_can_only_be_used_in_a_ts_file));
                            return true;
                        case 221 /* ModuleDeclaration */:
                            diagnostics.push(ts.createDiagnosticForNode(node, ts.Diagnostics.module_declarations_can_only_be_used_in_a_ts_file));
                            return true;
                        case 219 /* TypeAliasDeclaration */:
                            diagnostics.push(ts.createDiagnosticForNode(node, ts.Diagnostics.type_aliases_can_only_be_used_in_a_ts_file));
                            return true;
                        case 144 /* MethodDeclaration */:
                        case 143 /* MethodSignature */:
                        case 145 /* Constructor */:
                        case 146 /* GetAccessor */:
                        case 147 /* SetAccessor */:
                        case 176 /* FunctionExpression */:
                        case 216 /* FunctionDeclaration */:
                        case 177 /* ArrowFunction */:
                        case 216 /* FunctionDeclaration */:
                            var functionDeclaration = node;
                            if (checkModifiers(functionDeclaration.modifiers) ||
                                checkTypeParameters(functionDeclaration.typeParameters) ||
                                checkTypeAnnotation(functionDeclaration.type)) {
                                return true;
                            }
                            break;
                        case 196 /* VariableStatement */:
                            var variableStatement = node;
                            if (checkModifiers(variableStatement.modifiers)) {
                                return true;
                            }
                            break;
                        case 214 /* VariableDeclaration */:
                            var variableDeclaration = node;
                            if (checkTypeAnnotation(variableDeclaration.type)) {
                                return true;
                            }
                            break;
                        case 171 /* CallExpression */:
                        case 172 /* NewExpression */:
                            var expression = node;
                            if (expression.typeArguments && expression.typeArguments.length > 0) {
                                var start_1 = expression.typeArguments.pos;
                                diagnostics.push(ts.createFileDiagnostic(sourceFile, start_1, expression.typeArguments.end - start_1, ts.Diagnostics.type_arguments_can_only_be_used_in_a_ts_file));
                                return true;
                            }
                            break;
                        case 139 /* Parameter */:
                            var parameter = node;
                            if (parameter.modifiers) {
                                var start_2 = parameter.modifiers.pos;
                                diagnostics.push(ts.createFileDiagnostic(sourceFile, start_2, parameter.modifiers.end - start_2, ts.Diagnostics.parameter_modifiers_can_only_be_used_in_a_ts_file));
                                return true;
                            }
                            if (parameter.questionToken) {
                                diagnostics.push(ts.createDiagnosticForNode(parameter.questionToken, ts.Diagnostics._0_can_only_be_used_in_a_ts_file, "?"));
                                return true;
                            }
                            if (parameter.type) {
                                diagnostics.push(ts.createDiagnosticForNode(parameter.type, ts.Diagnostics.types_can_only_be_used_in_a_ts_file));
                                return true;
                            }
                            break;
                        case 142 /* PropertyDeclaration */:
                            diagnostics.push(ts.createDiagnosticForNode(node, ts.Diagnostics.property_declarations_can_only_be_used_in_a_ts_file));
                            return true;
                        case 220 /* EnumDeclaration */:
                            diagnostics.push(ts.createDiagnosticForNode(node, ts.Diagnostics.enum_declarations_can_only_be_used_in_a_ts_file));
                            return true;
                        case 174 /* TypeAssertionExpression */:
                            var typeAssertionExpression = node;
                            diagnostics.push(ts.createDiagnosticForNode(typeAssertionExpression.type, ts.Diagnostics.type_assertion_expressions_can_only_be_used_in_a_ts_file));
                            return true;
                        case 140 /* Decorator */:
                            if (!options.experimentalDecorators) {
                                diagnostics.push(ts.createDiagnosticForNode(node, ts.Diagnostics.Experimental_support_for_decorators_is_a_feature_that_is_subject_to_change_in_a_future_release_Set_the_experimentalDecorators_option_to_remove_this_warning));
                            }
                            return true;
                    }
                    return ts.forEachChild(node, walk);
                }
                function checkTypeParameters(typeParameters) {
                    if (typeParameters) {
                        var start_3 = typeParameters.pos;
                        diagnostics.push(ts.createFileDiagnostic(sourceFile, start_3, typeParameters.end - start_3, ts.Diagnostics.type_parameter_declarations_can_only_be_used_in_a_ts_file));
                        return true;
                    }
                    return false;
                }
                function checkTypeAnnotation(type) {
                    if (type) {
                        diagnostics.push(ts.createDiagnosticForNode(type, ts.Diagnostics.types_can_only_be_used_in_a_ts_file));
                        return true;
                    }
                    return false;
                }
                function checkModifiers(modifiers) {
                    if (modifiers) {
                        for (var _i = 0, modifiers_1 = modifiers; _i < modifiers_1.length; _i++) {
                            var modifier = modifiers_1[_i];
                            switch (modifier.kind) {
                                case 112 /* PublicKeyword */:
                                case 110 /* PrivateKeyword */:
                                case 111 /* ProtectedKeyword */:
                                case 122 /* DeclareKeyword */:
                                    diagnostics.push(ts.createDiagnosticForNode(modifier, ts.Diagnostics._0_can_only_be_used_in_a_ts_file, ts.tokenToString(modifier.kind)));
                                    return true;
                                // These are all legal modifiers.
                                case 113 /* StaticKeyword */:
                                case 82 /* ExportKeyword */:
                                case 74 /* ConstKeyword */:
                                case 77 /* DefaultKeyword */:
                                case 115 /* AbstractKeyword */:
                            }
                        }
                    }
                    return false;
                }
            });
        }
        function getDeclarationDiagnosticsWorker(sourceFile, cancellationToken) {
            return runWithCancellationToken(function () {
                var resolver = getDiagnosticsProducingTypeChecker().getEmitResolver(sourceFile, cancellationToken);
                // Don't actually write any files since we're just getting diagnostics.
                var writeFile = function () { };
                return ts.getDeclarationDiagnostics(getEmitHost(writeFile), resolver, sourceFile);
            });
        }
        function getDeclarationDiagnosticsForFile(sourceFile, cancellationToken) {
            return ts.isDeclarationFile(sourceFile) ? [] : getDeclarationDiagnosticsWorker(sourceFile, cancellationToken);
        }
        function getOptionsDiagnostics() {
            var allDiagnostics = [];
            ts.addRange(allDiagnostics, fileProcessingDiagnostics.getGlobalDiagnostics());
            ts.addRange(allDiagnostics, programDiagnostics.getGlobalDiagnostics());
            return ts.sortAndDeduplicateDiagnostics(allDiagnostics);
        }
        function getGlobalDiagnostics() {
            var allDiagnostics = [];
            ts.addRange(allDiagnostics, getDiagnosticsProducingTypeChecker().getGlobalDiagnostics());
            return ts.sortAndDeduplicateDiagnostics(allDiagnostics);
        }
        function hasExtension(fileName) {
            return ts.getBaseFileName(fileName).indexOf(".") >= 0;
        }
        function processRootFile(fileName, isDefaultLib) {
            processSourceFile(ts.normalizePath(fileName), isDefaultLib);
        }
        function fileReferenceIsEqualTo(a, b) {
            return a.fileName === b.fileName;
        }
        function moduleNameIsEqualTo(a, b) {
            return a.text === b.text;
        }
        function getTextOfLiteral(literal) {
            return literal.text;
        }
        function collectExternalModuleReferences(file) {
            if (file.imports) {
                return;
            }
            var isJavaScriptFile = ts.isSourceFileJavaScript(file);
            var isExternalModuleFile = ts.isExternalModule(file);
            var imports;
            var moduleAugmentations;
            for (var _i = 0, _a = file.statements; _i < _a.length; _i++) {
                var node = _a[_i];
                collectModuleReferences(node, /*inAmbientModule*/ false);
                if (isJavaScriptFile) {
                    collectRequireCalls(node);
                }
            }
            file.imports = imports || emptyArray;
            file.moduleAugmentations = moduleAugmentations || emptyArray;
            return;
            function collectModuleReferences(node, inAmbientModule) {
                switch (node.kind) {
                    case 225 /* ImportDeclaration */:
                    case 224 /* ImportEqualsDeclaration */:
                    case 231 /* ExportDeclaration */:
                        var moduleNameExpr = ts.getExternalModuleName(node);
                        if (!moduleNameExpr || moduleNameExpr.kind !== 9 /* StringLiteral */) {
                            break;
                        }
                        if (!moduleNameExpr.text) {
                            break;
                        }
                        // TypeScript 1.0 spec (April 2014): 12.1.6
                        // An ExternalImportDeclaration in an AmbientExternalModuleDeclaration may reference other external modules 
                        // only through top - level external module names. Relative external module names are not permitted.
                        if (!inAmbientModule || !ts.isExternalModuleNameRelative(moduleNameExpr.text)) {
                            (imports || (imports = [])).push(moduleNameExpr);
                        }
                        break;
                    case 221 /* ModuleDeclaration */:
                        if (ts.isAmbientModule(node) && (inAmbientModule || node.flags & 4 /* Ambient */ || ts.isDeclarationFile(file))) {
                            var moduleName = node.name;
                            // Ambient module declarations can be interpreted as augmentations for some existing external modules.
                            // This will happen in two cases:
                            // - if current file is external module then module augmentation is a ambient module declaration defined in the top level scope
                            // - if current file is not external module then module augmentation is an ambient module declaration with non-relative module name
                            //   immediately nested in top level ambient module declaration .
                            if (isExternalModuleFile || (inAmbientModule && !ts.isExternalModuleNameRelative(moduleName.text))) {
                                (moduleAugmentations || (moduleAugmentations = [])).push(moduleName);
                            }
                            else if (!inAmbientModule) {
                                // An AmbientExternalModuleDeclaration declares an external module. 
                                // This type of declaration is permitted only in the global module.
                                // The StringLiteral must specify a top - level external module name.
                                // Relative external module names are not permitted
                                // NOTE: body of ambient module is always a module block
                                for (var _i = 0, _a = node.body.statements; _i < _a.length; _i++) {
                                    var statement = _a[_i];
                                    collectModuleReferences(statement, /*inAmbientModule*/ true);
                                }
                            }
                        }
                }
            }
            function collectRequireCalls(node) {
                if (ts.isRequireCall(node, /*checkArgumentIsStringLiteral*/ true)) {
                    (imports || (imports = [])).push(node.arguments[0]);
                }
                else {
                    ts.forEachChild(node, collectRequireCalls);
                }
            }
        }
        function processSourceFile(fileName, isDefaultLib, refFile, refPos, refEnd) {
            var diagnosticArgument;
            var diagnostic;
            if (hasExtension(fileName)) {
                if (!options.allowNonTsExtensions && !ts.forEach(supportedExtensions, function (extension) { return ts.fileExtensionIs(host.getCanonicalFileName(fileName), extension); })) {
                    diagnostic = ts.Diagnostics.File_0_has_unsupported_extension_The_only_supported_extensions_are_1;
                    diagnosticArgument = [fileName, "'" + supportedExtensions.join("', '") + "'"];
                }
                else if (!findSourceFile(fileName, ts.toPath(fileName, currentDirectory, getCanonicalFileName), isDefaultLib, refFile, refPos, refEnd)) {
                    diagnostic = ts.Diagnostics.File_0_not_found;
                    diagnosticArgument = [fileName];
                }
                else if (refFile && host.getCanonicalFileName(fileName) === host.getCanonicalFileName(refFile.fileName)) {
                    diagnostic = ts.Diagnostics.A_file_cannot_have_a_reference_to_itself;
                    diagnosticArgument = [fileName];
                }
            }
            else {
                var nonTsFile = options.allowNonTsExtensions && findSourceFile(fileName, ts.toPath(fileName, currentDirectory, getCanonicalFileName), isDefaultLib, refFile, refPos, refEnd);
                if (!nonTsFile) {
                    if (options.allowNonTsExtensions) {
                        diagnostic = ts.Diagnostics.File_0_not_found;
                        diagnosticArgument = [fileName];
                    }
                    else if (!ts.forEach(supportedExtensions, function (extension) { return findSourceFile(fileName + extension, ts.toPath(fileName + extension, currentDirectory, getCanonicalFileName), isDefaultLib, refFile, refPos, refEnd); })) {
                        diagnostic = ts.Diagnostics.File_0_not_found;
                        fileName += ".ts";
                        diagnosticArgument = [fileName];
                    }
                }
            }
            if (diagnostic) {
                if (refFile !== undefined && refEnd !== undefined && refPos !== undefined) {
                    fileProcessingDiagnostics.add(ts.createFileDiagnostic.apply(void 0, [refFile, refPos, refEnd - refPos, diagnostic].concat(diagnosticArgument)));
                }
                else {
                    fileProcessingDiagnostics.add(ts.createCompilerDiagnostic.apply(void 0, [diagnostic].concat(diagnosticArgument)));
                }
            }
        }
        function reportFileNamesDifferOnlyInCasingError(fileName, existingFileName, refFile, refPos, refEnd) {
            if (refFile !== undefined && refPos !== undefined && refEnd !== undefined) {
                fileProcessingDiagnostics.add(ts.createFileDiagnostic(refFile, refPos, refEnd - refPos, ts.Diagnostics.File_name_0_differs_from_already_included_file_name_1_only_in_casing, fileName, existingFileName));
            }
            else {
                fileProcessingDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.File_name_0_differs_from_already_included_file_name_1_only_in_casing, fileName, existingFileName));
            }
        }
        // Get source file from normalized fileName
        function findSourceFile(fileName, path, isDefaultLib, refFile, refPos, refEnd) {
            if (filesByName.contains(path)) {
                var file_1 = filesByName.get(path);
                // try to check if we've already seen this file but with a different casing in path
                // NOTE: this only makes sense for case-insensitive file systems
                if (file_1 && options.forceConsistentCasingInFileNames && ts.getNormalizedAbsolutePath(file_1.fileName, currentDirectory) !== ts.getNormalizedAbsolutePath(fileName, currentDirectory)) {
                    reportFileNamesDifferOnlyInCasingError(fileName, file_1.fileName, refFile, refPos, refEnd);
                }
                return file_1;
            }
            // We haven't looked for this file, do so now and cache result
            var file = host.getSourceFile(fileName, options.target, function (hostErrorMessage) {
                if (refFile !== undefined && refPos !== undefined && refEnd !== undefined) {
                    fileProcessingDiagnostics.add(ts.createFileDiagnostic(refFile, refPos, refEnd - refPos, ts.Diagnostics.Cannot_read_file_0_Colon_1, fileName, hostErrorMessage));
                }
                else {
                    fileProcessingDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Cannot_read_file_0_Colon_1, fileName, hostErrorMessage));
                }
            });
            filesByName.set(path, file);
            if (file) {
                file.path = path;
                if (host.useCaseSensitiveFileNames()) {
                    // for case-sensitive file systems check if we've already seen some file with similar filename ignoring case
                    var existingFile = filesByNameIgnoreCase.get(path);
                    if (existingFile) {
                        reportFileNamesDifferOnlyInCasingError(fileName, existingFile.fileName, refFile, refPos, refEnd);
                    }
                    else {
                        filesByNameIgnoreCase.set(path, file);
                    }
                }
                skipDefaultLib = skipDefaultLib || file.hasNoDefaultLib;
                var basePath = ts.getDirectoryPath(fileName);
                if (!options.noResolve) {
                    processReferencedFiles(file, basePath);
                }
                // always process imported modules to record module name resolutions
                processImportedModules(file, basePath);
                if (isDefaultLib) {
                    files.unshift(file);
                }
                else {
                    files.push(file);
                }
            }
            return file;
        }
        function processReferencedFiles(file, basePath) {
            ts.forEach(file.referencedFiles, function (ref) {
                var referencedFileName = resolveTripleslashReference(ref.fileName, file.fileName);
                processSourceFile(referencedFileName, /*isDefaultLib*/ false, file, ref.pos, ref.end);
            });
        }
        function getCanonicalFileName(fileName) {
            return host.getCanonicalFileName(fileName);
        }
        function processImportedModules(file, basePath) {
            collectExternalModuleReferences(file);
            if (file.imports.length || file.moduleAugmentations.length) {
                file.resolvedModules = {};
                var moduleNames = ts.map(ts.concatenate(file.imports, file.moduleAugmentations), getTextOfLiteral);
                var resolutions = resolveModuleNamesWorker(moduleNames, ts.getNormalizedAbsolutePath(file.fileName, currentDirectory));
                for (var i = 0; i < moduleNames.length; i++) {
                    var resolution = resolutions[i];
                    ts.setResolvedModule(file, moduleNames[i], resolution);
                    // add file to program only if:
                    // - resolution was successfull
                    // - noResolve is falsy
                    // - module name come from the list fo imports
                    var shouldAddFile = resolution &&
                        !options.noResolve &&
                        i < file.imports.length;
                    if (shouldAddFile) {
                        var importedFile = findSourceFile(resolution.resolvedFileName, ts.toPath(resolution.resolvedFileName, currentDirectory, getCanonicalFileName), /*isDefaultLib*/ false, file, ts.skipTrivia(file.text, file.imports[i].pos), file.imports[i].end);
                        if (importedFile && resolution.isExternalLibraryImport) {
                            // Since currently irrespective of allowJs, we only look for supportedTypeScript extension external module files,
                            // this check is ok. Otherwise this would be never true for javascript file
                            if (!ts.isExternalModule(importedFile) && importedFile.statements.length) {
                                var start_4 = ts.getTokenPosOfNode(file.imports[i], file);
                                fileProcessingDiagnostics.add(ts.createFileDiagnostic(file, start_4, file.imports[i].end - start_4, ts.Diagnostics.Exported_external_package_typings_file_0_is_not_a_module_Please_contact_the_package_author_to_update_the_package_definition, importedFile.fileName));
                            }
                            else if (importedFile.referencedFiles.length) {
                                var firstRef = importedFile.referencedFiles[0];
                                fileProcessingDiagnostics.add(ts.createFileDiagnostic(importedFile, firstRef.pos, firstRef.end - firstRef.pos, ts.Diagnostics.Exported_external_package_typings_file_cannot_contain_tripleslash_references_Please_contact_the_package_author_to_update_the_package_definition));
                            }
                        }
                    }
                }
            }
            else {
                // no imports - drop cached module resolutions
                file.resolvedModules = undefined;
            }
            return;
        }
        function computeCommonSourceDirectory(sourceFiles) {
            var commonPathComponents;
            var failed = ts.forEach(files, function (sourceFile) {
                // Each file contributes into common source file path
                if (ts.isDeclarationFile(sourceFile)) {
                    return;
                }
                var sourcePathComponents = ts.getNormalizedPathComponents(sourceFile.fileName, currentDirectory);
                sourcePathComponents.pop(); // The base file name is not part of the common directory path
                if (!commonPathComponents) {
                    // first file
                    commonPathComponents = sourcePathComponents;
                    return;
                }
                for (var i = 0, n = Math.min(commonPathComponents.length, sourcePathComponents.length); i < n; i++) {
                    if (getCanonicalFileName(commonPathComponents[i]) !== getCanonicalFileName(sourcePathComponents[i])) {
                        if (i === 0) {
                            // Failed to find any common path component
                            return true;
                        }
                        // New common path found that is 0 -> i-1
                        commonPathComponents.length = i;
                        break;
                    }
                }
                // If the sourcePathComponents was shorter than the commonPathComponents, truncate to the sourcePathComponents
                if (sourcePathComponents.length < commonPathComponents.length) {
                    commonPathComponents.length = sourcePathComponents.length;
                }
            });
            // A common path can not be found when paths span multiple drives on windows, for example
            if (failed) {
                return "";
            }
            if (!commonPathComponents) {
                return currentDirectory;
            }
            return ts.getNormalizedPathFromPathComponents(commonPathComponents);
        }
        function checkSourceFilesBelongToPath(sourceFiles, rootDirectory) {
            var allFilesBelongToPath = true;
            if (sourceFiles) {
                var absoluteRootDirectoryPath = host.getCanonicalFileName(ts.getNormalizedAbsolutePath(rootDirectory, currentDirectory));
                for (var _i = 0, sourceFiles_1 = sourceFiles; _i < sourceFiles_1.length; _i++) {
                    var sourceFile = sourceFiles_1[_i];
                    if (!ts.isDeclarationFile(sourceFile)) {
                        var absoluteSourceFilePath = host.getCanonicalFileName(ts.getNormalizedAbsolutePath(sourceFile.fileName, currentDirectory));
                        if (absoluteSourceFilePath.indexOf(absoluteRootDirectoryPath) !== 0) {
                            programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.File_0_is_not_under_rootDir_1_rootDir_is_expected_to_contain_all_source_files, sourceFile.fileName, options.rootDir));
                            allFilesBelongToPath = false;
                        }
                    }
                }
            }
            return allFilesBelongToPath;
        }
        function verifyCompilerOptions() {
            if (options.isolatedModules) {
                if (options.declaration) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "declaration", "isolatedModules"));
                }
                if (options.noEmitOnError) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "noEmitOnError", "isolatedModules"));
                }
                if (options.out) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "out", "isolatedModules"));
                }
                if (options.outFile) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "outFile", "isolatedModules"));
                }
            }
            if (options.inlineSourceMap) {
                if (options.sourceMap) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "sourceMap", "inlineSourceMap"));
                }
                if (options.mapRoot) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "mapRoot", "inlineSourceMap"));
                }
            }
            if (options.inlineSources) {
                if (!options.sourceMap && !options.inlineSourceMap) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_inlineSources_can_only_be_used_when_either_option_inlineSourceMap_or_option_sourceMap_is_provided));
                }
                if (options.sourceRoot) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "sourceRoot", "inlineSources"));
                }
            }
            if (options.out && options.outFile) {
                programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "out", "outFile"));
            }
            if (!options.sourceMap && (options.mapRoot || options.sourceRoot)) {
                // Error to specify --mapRoot or --sourceRoot without mapSourceFiles
                if (options.mapRoot) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_without_specifying_option_1, "mapRoot", "sourceMap"));
                }
                if (options.sourceRoot && !options.inlineSourceMap) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_without_specifying_option_1, "sourceRoot", "sourceMap"));
                }
            }
            var languageVersion = options.target || 0 /* ES3 */;
            var outFile = options.outFile || options.out;
            var firstExternalModuleSourceFile = ts.forEach(files, function (f) { return ts.isExternalModule(f) ? f : undefined; });
            if (options.isolatedModules) {
                if (options.module === 0 /* None */ && languageVersion < 2 /* ES6 */) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_isolatedModules_can_only_be_used_when_either_option_module_is_provided_or_option_target_is_ES2015_or_higher));
                }
                var firstNonExternalModuleSourceFile = ts.forEach(files, function (f) { return !ts.isExternalModule(f) && !ts.isDeclarationFile(f) ? f : undefined; });
                if (firstNonExternalModuleSourceFile) {
                    var span = ts.getErrorSpanForNode(firstNonExternalModuleSourceFile, firstNonExternalModuleSourceFile);
                    programDiagnostics.add(ts.createFileDiagnostic(firstNonExternalModuleSourceFile, span.start, span.length, ts.Diagnostics.Cannot_compile_namespaces_when_the_isolatedModules_flag_is_provided));
                }
            }
            else if (firstExternalModuleSourceFile && languageVersion < 2 /* ES6 */ && options.module === 0 /* None */) {
                // We cannot use createDiagnosticFromNode because nodes do not have parents yet
                var span = ts.getErrorSpanForNode(firstExternalModuleSourceFile, firstExternalModuleSourceFile.externalModuleIndicator);
                programDiagnostics.add(ts.createFileDiagnostic(firstExternalModuleSourceFile, span.start, span.length, ts.Diagnostics.Cannot_compile_modules_unless_the_module_flag_is_provided_with_a_valid_module_type_Consider_setting_the_module_compiler_option_in_a_tsconfig_json_file));
            }
            // Cannot specify module gen target of es6 when below es6
            if (options.module === 5 /* ES6 */ && languageVersion < 2 /* ES6 */) {
                programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Cannot_compile_modules_into_es2015_when_targeting_ES5_or_lower));
            }
            // Cannot specify module gen that isn't amd or system with --out
            if (outFile && options.module && !(options.module === 2 /* AMD */ || options.module === 4 /* System */)) {
                programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Only_amd_and_system_modules_are_supported_alongside_0, options.out ? "out" : "outFile"));
            }
            // there has to be common source directory if user specified --outdir || --sourceRoot
            // if user specified --mapRoot, there needs to be common source directory if there would be multiple files being emitted
            if (options.outDir ||
                options.sourceRoot ||
                options.mapRoot) {
                // Precalculate and cache the common source directory
                var dir = getCommonSourceDirectory();
                // If we failed to find a good common directory, but outDir is specified and at least one of our files is on a windows drive/URL/other resource, add a failure
                if (options.outDir && dir === "" && ts.forEach(files, function (file) { return ts.getRootLength(file.fileName) > 1; })) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Cannot_find_the_common_subdirectory_path_for_the_input_files));
                }
            }
            if (options.noEmit) {
                if (options.out) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "noEmit", "out"));
                }
                if (options.outFile) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "noEmit", "outFile"));
                }
                if (options.outDir) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "noEmit", "outDir"));
                }
                if (options.declaration) {
                    programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "noEmit", "declaration"));
                }
            }
            else if (options.allowJs && options.declaration) {
                programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_with_option_1, "allowJs", "declaration"));
            }
            if (options.emitDecoratorMetadata &&
                !options.experimentalDecorators) {
                programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Option_0_cannot_be_specified_without_specifying_option_1, "emitDecoratorMetadata", "experimentalDecorators"));
            }
            if (options.reactNamespace && !ts.isIdentifier(options.reactNamespace, languageVersion)) {
                programDiagnostics.add(ts.createCompilerDiagnostic(ts.Diagnostics.Invalide_value_for_reactNamespace_0_is_not_a_valid_identifier, options.reactNamespace));
            }
            // If the emit is enabled make sure that every output file is unique and not overwriting any of the input files
            if (!options.noEmit && !options.suppressOutputPathCheck) {
                var emitHost = getEmitHost();
                var emitFilesSeen_1 = ts.createFileMap(!host.useCaseSensitiveFileNames() ? function (key) { return key.toLocaleLowerCase(); } : undefined);
                ts.forEachExpectedEmitFile(emitHost, function (emitFileNames, sourceFiles, isBundledEmit) {
                    verifyEmitFilePath(emitFileNames.jsFilePath, emitFilesSeen_1);
                    verifyEmitFilePath(emitFileNames.declarationFilePath, emitFilesSeen_1);
                });
            }
            // Verify that all the emit files are unique and don't overwrite input files
            function verifyEmitFilePath(emitFileName, emitFilesSeen) {
                if (emitFileName) {
                    var emitFilePath = ts.toPath(emitFileName, currentDirectory, getCanonicalFileName);
                    // Report error if the output overwrites input file
                    if (filesByName.contains(emitFilePath)) {
                        createEmitBlockingDiagnostics(emitFileName, emitFilePath, ts.Diagnostics.Cannot_write_file_0_because_it_would_overwrite_input_file);
                    }
                    // Report error if multiple files write into same file
                    if (emitFilesSeen.contains(emitFilePath)) {
                        // Already seen the same emit file - report error
                        createEmitBlockingDiagnostics(emitFileName, emitFilePath, ts.Diagnostics.Cannot_write_file_0_because_it_would_be_overwritten_by_multiple_input_files);
                    }
                    else {
                        emitFilesSeen.set(emitFilePath, true);
                    }
                }
            }
        }
        function createEmitBlockingDiagnostics(emitFileName, emitFilePath, message) {
            hasEmitBlockingDiagnostics.set(ts.toPath(emitFileName, currentDirectory, getCanonicalFileName), true);
            programDiagnostics.add(ts.createCompilerDiagnostic(message, emitFileName));
        }
    }
    ts.createProgram = createProgram;
})(ts || (ts = {}));
