/// <reference path="core.ts"/>
var ts;
(function (ts) {
    ts.sys = (function () {
        function getWScriptSystem() {
            var fso = new ActiveXObject("Scripting.FileSystemObject");
            var fileStream = new ActiveXObject("ADODB.Stream");
            fileStream.Type = 2 /*text*/;
            var binaryStream = new ActiveXObject("ADODB.Stream");
            binaryStream.Type = 1 /*binary*/;
            var args = [];
            for (var i = 0; i < WScript.Arguments.length; i++) {
                args[i] = WScript.Arguments.Item(i);
            }
            function readFile(fileName, encoding) {
                if (!fso.FileExists(fileName)) {
                    return undefined;
                }
                fileStream.Open();
                try {
                    if (encoding) {
                        fileStream.Charset = encoding;
                        fileStream.LoadFromFile(fileName);
                    }
                    else {
                        // Load file and read the first two bytes into a string with no interpretation
                        fileStream.Charset = "x-ansi";
                        fileStream.LoadFromFile(fileName);
                        var bom = fileStream.ReadText(2) || "";
                        // Position must be at 0 before encoding can be changed
                        fileStream.Position = 0;
                        // [0xFF,0xFE] and [0xFE,0xFF] mean utf-16 (little or big endian), otherwise default to utf-8
                        fileStream.Charset = bom.length >= 2 && (bom.charCodeAt(0) === 0xFF && bom.charCodeAt(1) === 0xFE || bom.charCodeAt(0) === 0xFE && bom.charCodeAt(1) === 0xFF) ? "unicode" : "utf-8";
                    }
                    // ReadText method always strips byte order mark from resulting string
                    return fileStream.ReadText();
                }
                catch (e) {
                    throw e;
                }
                finally {
                    fileStream.Close();
                }
            }
            function writeFile(fileName, data, writeByteOrderMark) {
                fileStream.Open();
                binaryStream.Open();
                try {
                    // Write characters in UTF-8 encoding
                    fileStream.Charset = "utf-8";
                    fileStream.WriteText(data);
                    // If we don't want the BOM, then skip it by setting the starting location to 3 (size of BOM).
                    // If not, start from position 0, as the BOM will be added automatically when charset==utf8.
                    if (writeByteOrderMark) {
                        fileStream.Position = 0;
                    }
                    else {
                        fileStream.Position = 3;
                    }
                    fileStream.CopyTo(binaryStream);
                    binaryStream.SaveToFile(fileName, 2 /*overwrite*/);
                }
                finally {
                    binaryStream.Close();
                    fileStream.Close();
                }
            }
            function getCanonicalPath(path) {
                return path.toLowerCase();
            }
            function getNames(collection) {
                var result = [];
                for (var e = new Enumerator(collection); !e.atEnd(); e.moveNext()) {
                    result.push(e.item().Name);
                }
                return result.sort();
            }
            function readDirectory(path, extension, exclude) {
                var result = [];
                exclude = ts.map(exclude, function (s) { return getCanonicalPath(ts.combinePaths(path, s)); });
                visitDirectory(path);
                return result;
                function visitDirectory(path) {
                    var folder = fso.GetFolder(path || ".");
                    var files = getNames(folder.files);
                    for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
                        var current = files_1[_i];
                        var name_1 = ts.combinePaths(path, current);
                        if ((!extension || ts.fileExtensionIs(name_1, extension)) && !ts.contains(exclude, getCanonicalPath(name_1))) {
                            result.push(name_1);
                        }
                    }
                    var subfolders = getNames(folder.subfolders);
                    for (var _a = 0, subfolders_1 = subfolders; _a < subfolders_1.length; _a++) {
                        var current = subfolders_1[_a];
                        var name_2 = ts.combinePaths(path, current);
                        if (!ts.contains(exclude, getCanonicalPath(name_2))) {
                            visitDirectory(name_2);
                        }
                    }
                }
            }
            return {
                args: args,
                newLine: "\r\n",
                useCaseSensitiveFileNames: false,
                write: function (s) {
                    WScript.StdOut.Write(s);
                },
                readFile: readFile,
                writeFile: writeFile,
                resolvePath: function (path) {
                    return fso.GetAbsolutePathName(path);
                },
                fileExists: function (path) {
                    return fso.FileExists(path);
                },
                directoryExists: function (path) {
                    return fso.FolderExists(path);
                },
                createDirectory: function (directoryName) {
                    if (!this.directoryExists(directoryName)) {
                        fso.CreateFolder(directoryName);
                    }
                },
                getExecutingFilePath: function () {
                    return WScript.ScriptFullName;
                },
                getCurrentDirectory: function () {
                    return new ActiveXObject("WScript.Shell").CurrentDirectory;
                },
                readDirectory: readDirectory,
                exit: function (exitCode) {
                    try {
                        WScript.Quit(exitCode);
                    }
                    catch (e) {
                    }
                }
            };
        }
        function getNodeSystem() {
            var _fs = require("fs");
            var _path = require("path");
            var _os = require("os");
            // average async stat takes about 30 microseconds
            // set chunk size to do 30 files in < 1 millisecond
            function createPollingWatchedFileSet(interval, chunkSize) {
                if (interval === void 0) { interval = 2500; }
                if (chunkSize === void 0) { chunkSize = 30; }
                var watchedFiles = [];
                var nextFileToCheck = 0;
                var watchTimer;
                function getModifiedTime(fileName) {
                    return _fs.statSync(fileName).mtime;
                }
                function poll(checkedIndex) {
                    var watchedFile = watchedFiles[checkedIndex];
                    if (!watchedFile) {
                        return;
                    }
                    _fs.stat(watchedFile.filePath, function (err, stats) {
                        if (err) {
                            watchedFile.callback(watchedFile.filePath);
                        }
                        else if (watchedFile.mtime.getTime() !== stats.mtime.getTime()) {
                            watchedFile.mtime = getModifiedTime(watchedFile.filePath);
                            watchedFile.callback(watchedFile.filePath, watchedFile.mtime.getTime() === 0);
                        }
                    });
                }
                // this implementation uses polling and
                // stat due to inconsistencies of fs.watch
                // and efficiency of stat on modern filesystems
                function startWatchTimer() {
                    watchTimer = setInterval(function () {
                        var count = 0;
                        var nextToCheck = nextFileToCheck;
                        var firstCheck = -1;
                        while ((count < chunkSize) && (nextToCheck !== firstCheck)) {
                            poll(nextToCheck);
                            if (firstCheck < 0) {
                                firstCheck = nextToCheck;
                            }
                            nextToCheck++;
                            if (nextToCheck === watchedFiles.length) {
                                nextToCheck = 0;
                            }
                            count++;
                        }
                        nextFileToCheck = nextToCheck;
                    }, interval);
                }
                function addFile(filePath, callback) {
                    var file = {
                        filePath: filePath,
                        callback: callback,
                        mtime: getModifiedTime(filePath)
                    };
                    watchedFiles.push(file);
                    if (watchedFiles.length === 1) {
                        startWatchTimer();
                    }
                    return file;
                }
                function removeFile(file) {
                    watchedFiles = ts.copyListRemovingItem(file, watchedFiles);
                }
                return {
                    getModifiedTime: getModifiedTime,
                    poll: poll,
                    startWatchTimer: startWatchTimer,
                    addFile: addFile,
                    removeFile: removeFile
                };
            }
            function createWatchedFileSet() {
                var dirWatchers = ts.createFileMap();
                // One file can have multiple watchers
                var fileWatcherCallbacks = ts.createFileMap();
                return { addFile: addFile, removeFile: removeFile };
                function reduceDirWatcherRefCountForFile(filePath) {
                    var dirPath = ts.getDirectoryPath(filePath);
                    if (dirWatchers.contains(dirPath)) {
                        var watcher = dirWatchers.get(dirPath);
                        watcher.referenceCount -= 1;
                        if (watcher.referenceCount <= 0) {
                            watcher.close();
                            dirWatchers.remove(dirPath);
                        }
                    }
                }
                function addDirWatcher(dirPath) {
                    if (dirWatchers.contains(dirPath)) {
                        var watcher_1 = dirWatchers.get(dirPath);
                        watcher_1.referenceCount += 1;
                        return;
                    }
                    var watcher = _fs.watch(dirPath, { persistent: true }, function (eventName, relativeFileName) { return fileEventHandler(eventName, relativeFileName, dirPath); });
                    watcher.referenceCount = 1;
                    dirWatchers.set(dirPath, watcher);
                    return;
                }
                function addFileWatcherCallback(filePath, callback) {
                    if (fileWatcherCallbacks.contains(filePath)) {
                        fileWatcherCallbacks.get(filePath).push(callback);
                    }
                    else {
                        fileWatcherCallbacks.set(filePath, [callback]);
                    }
                }
                function addFile(filePath, callback) {
                    addFileWatcherCallback(filePath, callback);
                    addDirWatcher(ts.getDirectoryPath(filePath));
                    return { filePath: filePath, callback: callback };
                }
                function removeFile(watchedFile) {
                    removeFileWatcherCallback(watchedFile.filePath, watchedFile.callback);
                    reduceDirWatcherRefCountForFile(watchedFile.filePath);
                }
                function removeFileWatcherCallback(filePath, callback) {
                    if (fileWatcherCallbacks.contains(filePath)) {
                        var newCallbacks = ts.copyListRemovingItem(callback, fileWatcherCallbacks.get(filePath));
                        if (newCallbacks.length === 0) {
                            fileWatcherCallbacks.remove(filePath);
                        }
                        else {
                            fileWatcherCallbacks.set(filePath, newCallbacks);
                        }
                    }
                }
                /**
                 * @param watcherPath is the path from which the watcher is triggered.
                 */
                function fileEventHandler(eventName, relativeFileName, baseDirPath) {
                    // When files are deleted from disk, the triggered "rename" event would have a relativefileName of "undefined"
                    var filePath = typeof relativeFileName !== "string"
                        ? undefined
                        : ts.toPath(relativeFileName, baseDirPath, ts.createGetCanonicalFileName(ts.sys.useCaseSensitiveFileNames));
                    // Some applications save a working file via rename operations
                    if ((eventName === "change" || eventName === "rename") && fileWatcherCallbacks.contains(filePath)) {
                        for (var _i = 0, _a = fileWatcherCallbacks.get(filePath); _i < _a.length; _i++) {
                            var fileCallback = _a[_i];
                            fileCallback(filePath);
                        }
                    }
                }
            }
            // REVIEW: for now this implementation uses polling.
            // The advantage of polling is that it works reliably
            // on all os and with network mounted files.
            // For 90 referenced files, the average time to detect
            // changes is 2*msInterval (by default 5 seconds).
            // The overhead of this is .04 percent (1/2500) with
            // average pause of < 1 millisecond (and max
            // pause less than 1.5 milliseconds); question is
            // do we anticipate reference sets in the 100s and
            // do we care about waiting 10-20 seconds to detect
            // changes for large reference sets? If so, do we want
            // to increase the chunk size or decrease the interval
            // time dynamically to match the large reference set?
            var pollingWatchedFileSet = createPollingWatchedFileSet();
            var watchedFileSet = createWatchedFileSet();
            function isNode4OrLater() {
                return parseInt(process.version.charAt(1)) >= 4;
            }
            var platform = _os.platform();
            // win32\win64 are case insensitive platforms, MacOS (darwin) by default is also case insensitive
            var useCaseSensitiveFileNames = platform !== "win32" && platform !== "win64" && platform !== "darwin";
            function readFile(fileName, encoding) {
                if (!_fs.existsSync(fileName)) {
                    return undefined;
                }
                var buffer = _fs.readFileSync(fileName);
                var len = buffer.length;
                if (len >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
                    // Big endian UTF-16 byte order mark detected. Since big endian is not supported by node.js,
                    // flip all byte pairs and treat as little endian.
                    len &= ~1;
                    for (var i = 0; i < len; i += 2) {
                        var temp = buffer[i];
                        buffer[i] = buffer[i + 1];
                        buffer[i + 1] = temp;
                    }
                    return buffer.toString("utf16le", 2);
                }
                if (len >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
                    // Little endian UTF-16 byte order mark detected
                    return buffer.toString("utf16le", 2);
                }
                if (len >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
                    // UTF-8 byte order mark detected
                    return buffer.toString("utf8", 3);
                }
                // Default is UTF-8 with no byte order mark
                return buffer.toString("utf8");
            }
            function writeFile(fileName, data, writeByteOrderMark) {
                // If a BOM is required, emit one
                if (writeByteOrderMark) {
                    data = "\uFEFF" + data;
                }
                var fd;
                try {
                    fd = _fs.openSync(fileName, "w");
                    _fs.writeSync(fd, data, undefined, "utf8");
                }
                finally {
                    if (fd !== undefined) {
                        _fs.closeSync(fd);
                    }
                }
            }
            function getCanonicalPath(path) {
                return useCaseSensitiveFileNames ? path : path.toLowerCase();
            }
            function readDirectory(path, extension, exclude) {
                var result = [];
                exclude = ts.map(exclude, function (s) { return getCanonicalPath(ts.combinePaths(path, s)); });
                visitDirectory(path);
                return result;
                function visitDirectory(path) {
                    var files = _fs.readdirSync(path || ".").sort();
                    var directories = [];
                    for (var _i = 0, files_2 = files; _i < files_2.length; _i++) {
                        var current = files_2[_i];
                        var name_3 = ts.combinePaths(path, current);
                        if (!ts.contains(exclude, getCanonicalPath(name_3))) {
                            var stat = _fs.statSync(name_3);
                            if (stat.isFile()) {
                                if (!extension || ts.fileExtensionIs(name_3, extension)) {
                                    result.push(name_3);
                                }
                            }
                            else if (stat.isDirectory()) {
                                directories.push(name_3);
                            }
                        }
                    }
                    for (var _a = 0, directories_1 = directories; _a < directories_1.length; _a++) {
                        var current = directories_1[_a];
                        visitDirectory(current);
                    }
                }
            }
            return {
                args: process.argv.slice(2),
                newLine: _os.EOL,
                useCaseSensitiveFileNames: useCaseSensitiveFileNames,
                write: function (s) {
                    process.stdout.write(s);
                },
                readFile: readFile,
                writeFile: writeFile,
                watchFile: function (filePath, callback) {
                    // Node 4.0 stablized the `fs.watch` function on Windows which avoids polling
                    // and is more efficient than `fs.watchFile` (ref: https://github.com/nodejs/node/pull/2649
                    // and https://github.com/Microsoft/TypeScript/issues/4643), therefore
                    // if the current node.js version is newer than 4, use `fs.watch` instead.
                    var watchSet = isNode4OrLater() ? watchedFileSet : pollingWatchedFileSet;
                    var watchedFile = watchSet.addFile(filePath, callback);
                    return {
                        close: function () { return watchSet.removeFile(watchedFile); }
                    };
                },
                watchDirectory: function (path, callback, recursive) {
                    // Node 4.0 `fs.watch` function supports the "recursive" option on both OSX and Windows
                    // (ref: https://github.com/nodejs/node/pull/2649 and https://github.com/Microsoft/TypeScript/issues/4643)
                    var options;
                    if (isNode4OrLater() && (process.platform === "win32" || process.platform === "darwin")) {
                        options = { persistent: true, recursive: !!recursive };
                    }
                    else {
                        options = { persistent: true };
                    }
                    return _fs.watch(path, options, function (eventName, relativeFileName) {
                        // In watchDirectory we only care about adding and removing files (when event name is
                        // "rename"); changes made within files are handled by corresponding fileWatchers (when
                        // event name is "change")
                        if (eventName === "rename") {
                            // When deleting a file, the passed baseFileName is null
                            callback(!relativeFileName ? relativeFileName : ts.normalizePath(ts.combinePaths(path, relativeFileName)));
                        }
                        ;
                    });
                },
                resolvePath: function (path) {
                    return _path.resolve(path);
                },
                fileExists: function (path) {
                    return _fs.existsSync(path);
                },
                directoryExists: function (path) {
                    return _fs.existsSync(path) && _fs.statSync(path).isDirectory();
                },
                createDirectory: function (directoryName) {
                    if (!this.directoryExists(directoryName)) {
                        _fs.mkdirSync(directoryName);
                    }
                },
                getExecutingFilePath: function () {
                    return __filename;
                },
                getCurrentDirectory: function () {
                    return process.cwd();
                },
                readDirectory: readDirectory,
                getMemoryUsage: function () {
                    if (global.gc) {
                        global.gc();
                    }
                    return process.memoryUsage().heapUsed;
                },
                exit: function (exitCode) {
                    process.exit(exitCode);
                }
            };
        }
        function getChakraSystem() {
            return {
                newLine: ChakraHost.newLine || "\r\n",
                args: ChakraHost.args,
                useCaseSensitiveFileNames: !!ChakraHost.useCaseSensitiveFileNames,
                write: ChakraHost.echo,
                readFile: function (path, encoding) {
                    // encoding is automatically handled by the implementation in ChakraHost
                    return ChakraHost.readFile(path);
                },
                writeFile: function (path, data, writeByteOrderMark) {
                    // If a BOM is required, emit one
                    if (writeByteOrderMark) {
                        data = "\uFEFF" + data;
                    }
                    ChakraHost.writeFile(path, data);
                },
                resolvePath: ChakraHost.resolvePath,
                fileExists: ChakraHost.fileExists,
                directoryExists: ChakraHost.directoryExists,
                createDirectory: ChakraHost.createDirectory,
                getExecutingFilePath: function () { return ChakraHost.executingFile; },
                getCurrentDirectory: function () { return ChakraHost.currentDirectory; },
                readDirectory: ChakraHost.readDirectory,
                exit: ChakraHost.quit
            };
        }
        if (typeof WScript !== "undefined" && typeof ActiveXObject === "function") {
            return getWScriptSystem();
        }
        else if (typeof process !== "undefined" && process.nextTick && !process.browser && typeof require !== "undefined") {
            // process and process.nextTick checks if current environment is node-like
            // process.browser check excludes webpack and browserify
            return getNodeSystem();
        }
        else if (typeof ChakraHost !== "undefined") {
            return getChakraSystem();
        }
        else {
            return undefined; // Unsupported host
        }
    })();
})(ts || (ts = {}));
