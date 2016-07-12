/// <reference path="sys.ts"/>
/// <reference path="types.ts"/>
/// <reference path="core.ts"/>
/// <reference path="diagnosticInformationMap.generated.ts"/>
/// <reference path="scanner.ts"/>
var ts;
(function (ts) {
    /* @internal */
    ts.optionDeclarations = [
        {
            name: "charset",
            type: "string"
        },
        {
            name: "declaration",
            shortName: "d",
            type: "boolean",
            description: ts.Diagnostics.Generates_corresponding_d_ts_file
        },
        {
            name: "diagnostics",
            type: "boolean"
        },
        {
            name: "emitBOM",
            type: "boolean"
        },
        {
            name: "help",
            shortName: "h",
            type: "boolean",
            description: ts.Diagnostics.Print_this_message
        },
        {
            name: "init",
            type: "boolean",
            description: ts.Diagnostics.Initializes_a_TypeScript_project_and_creates_a_tsconfig_json_file
        },
        {
            name: "inlineSourceMap",
            type: "boolean"
        },
        {
            name: "inlineSources",
            type: "boolean"
        },
        {
            name: "jsx",
            type: {
                "preserve": 1 /* Preserve */,
                "react": 2 /* React */
            },
            paramType: ts.Diagnostics.KIND,
            description: ts.Diagnostics.Specify_JSX_code_generation_Colon_preserve_or_react,
            error: ts.Diagnostics.Argument_for_jsx_must_be_preserve_or_react
        },
        {
            name: "reactNamespace",
            type: "string",
            description: ts.Diagnostics.Specifies_the_object_invoked_for_createElement_and_spread_when_targeting_react_JSX_emit
        },
        {
            name: "listFiles",
            type: "boolean"
        },
        {
            name: "locale",
            type: "string"
        },
        {
            name: "mapRoot",
            type: "string",
            isFilePath: true,
            description: ts.Diagnostics.Specifies_the_location_where_debugger_should_locate_map_files_instead_of_generated_locations,
            paramType: ts.Diagnostics.LOCATION
        },
        {
            name: "module",
            shortName: "m",
            type: {
                "none": 0 /* None */,
                "commonjs": 1 /* CommonJS */,
                "amd": 2 /* AMD */,
                "system": 4 /* System */,
                "umd": 3 /* UMD */,
                "es6": 5 /* ES6 */,
                "es2015": 5 /* ES2015 */
            },
            description: ts.Diagnostics.Specify_module_code_generation_Colon_commonjs_amd_system_umd_or_es2015,
            paramType: ts.Diagnostics.KIND,
            error: ts.Diagnostics.Argument_for_module_option_must_be_commonjs_amd_system_umd_es2015_or_none
        },
        {
            name: "newLine",
            type: {
                "crlf": 0 /* CarriageReturnLineFeed */,
                "lf": 1 /* LineFeed */
            },
            description: ts.Diagnostics.Specifies_the_end_of_line_sequence_to_be_used_when_emitting_files_Colon_CRLF_dos_or_LF_unix,
            paramType: ts.Diagnostics.NEWLINE,
            error: ts.Diagnostics.Argument_for_newLine_option_must_be_CRLF_or_LF
        },
        {
            name: "noEmit",
            type: "boolean",
            description: ts.Diagnostics.Do_not_emit_outputs
        },
        {
            name: "noEmitHelpers",
            type: "boolean"
        },
        {
            name: "noEmitOnError",
            type: "boolean",
            description: ts.Diagnostics.Do_not_emit_outputs_if_any_errors_were_reported
        },
        {
            name: "noImplicitAny",
            type: "boolean",
            description: ts.Diagnostics.Raise_error_on_expressions_and_declarations_with_an_implied_any_type
        },
        {
            name: "noLib",
            type: "boolean"
        },
        {
            name: "noResolve",
            type: "boolean"
        },
        {
            name: "skipDefaultLibCheck",
            type: "boolean"
        },
        {
            name: "out",
            type: "string",
            isFilePath: false,
            // for correct behaviour, please use outFile
            paramType: ts.Diagnostics.FILE
        },
        {
            name: "outFile",
            type: "string",
            isFilePath: true,
            description: ts.Diagnostics.Concatenate_and_emit_output_to_single_file,
            paramType: ts.Diagnostics.FILE
        },
        {
            name: "outDir",
            type: "string",
            isFilePath: true,
            description: ts.Diagnostics.Redirect_output_structure_to_the_directory,
            paramType: ts.Diagnostics.DIRECTORY
        },
        {
            name: "preserveConstEnums",
            type: "boolean",
            description: ts.Diagnostics.Do_not_erase_const_enum_declarations_in_generated_code
        },
        {
            name: "pretty",
            paramType: ts.Diagnostics.KIND,
            description: ts.Diagnostics.Stylize_errors_and_messages_using_color_and_context_experimental,
            type: "boolean"
        },
        {
            name: "project",
            shortName: "p",
            type: "string",
            isFilePath: true,
            description: ts.Diagnostics.Compile_the_project_in_the_given_directory,
            paramType: ts.Diagnostics.DIRECTORY
        },
        {
            name: "removeComments",
            type: "boolean",
            description: ts.Diagnostics.Do_not_emit_comments_to_output
        },
        {
            name: "rootDir",
            type: "string",
            isFilePath: true,
            description: ts.Diagnostics.Specifies_the_root_directory_of_input_files_Use_to_control_the_output_directory_structure_with_outDir,
            paramType: ts.Diagnostics.LOCATION
        },
        {
            name: "isolatedModules",
            type: "boolean"
        },
        {
            name: "sourceMap",
            type: "boolean",
            description: ts.Diagnostics.Generates_corresponding_map_file
        },
        {
            name: "sourceRoot",
            type: "string",
            isFilePath: true,
            description: ts.Diagnostics.Specifies_the_location_where_debugger_should_locate_TypeScript_files_instead_of_source_locations,
            paramType: ts.Diagnostics.LOCATION
        },
        {
            name: "suppressExcessPropertyErrors",
            type: "boolean",
            description: ts.Diagnostics.Suppress_excess_property_checks_for_object_literals,
            experimental: true
        },
        {
            name: "suppressImplicitAnyIndexErrors",
            type: "boolean",
            description: ts.Diagnostics.Suppress_noImplicitAny_errors_for_indexing_objects_lacking_index_signatures
        },
        {
            name: "stripInternal",
            type: "boolean",
            description: ts.Diagnostics.Do_not_emit_declarations_for_code_that_has_an_internal_annotation,
            experimental: true
        },
        {
            name: "target",
            shortName: "t",
            type: {
                "es3": 0 /* ES3 */,
                "es5": 1 /* ES5 */,
                "es6": 2 /* ES6 */,
                "es2015": 2 /* ES2015 */
            },
            description: ts.Diagnostics.Specify_ECMAScript_target_version_Colon_ES3_default_ES5_or_ES2015_experimental,
            paramType: ts.Diagnostics.VERSION,
            error: ts.Diagnostics.Argument_for_target_option_must_be_ES3_ES5_or_ES2015
        },
        {
            name: "version",
            shortName: "v",
            type: "boolean",
            description: ts.Diagnostics.Print_the_compiler_s_version
        },
        {
            name: "watch",
            shortName: "w",
            type: "boolean",
            description: ts.Diagnostics.Watch_input_files
        },
        {
            name: "experimentalDecorators",
            type: "boolean",
            description: ts.Diagnostics.Enables_experimental_support_for_ES7_decorators
        },
        {
            name: "emitDecoratorMetadata",
            type: "boolean",
            experimental: true,
            description: ts.Diagnostics.Enables_experimental_support_for_emitting_type_metadata_for_decorators
        },
        {
            name: "moduleResolution",
            type: {
                "node": 2 /* NodeJs */,
                "classic": 1 /* Classic */
            },
            description: ts.Diagnostics.Specifies_module_resolution_strategy_Colon_node_Node_js_or_classic_TypeScript_pre_1_6,
            error: ts.Diagnostics.Argument_for_moduleResolution_option_must_be_node_or_classic
        },
        {
            name: "allowUnusedLabels",
            type: "boolean",
            description: ts.Diagnostics.Do_not_report_errors_on_unused_labels
        },
        {
            name: "noImplicitReturns",
            type: "boolean",
            description: ts.Diagnostics.Report_error_when_not_all_code_paths_in_function_return_a_value
        },
        {
            name: "noFallthroughCasesInSwitch",
            type: "boolean",
            description: ts.Diagnostics.Report_errors_for_fallthrough_cases_in_switch_statement
        },
        {
            name: "allowUnreachableCode",
            type: "boolean",
            description: ts.Diagnostics.Do_not_report_errors_on_unreachable_code
        },
        {
            name: "forceConsistentCasingInFileNames",
            type: "boolean",
            description: ts.Diagnostics.Disallow_inconsistently_cased_references_to_the_same_file
        },
        {
            name: "allowSyntheticDefaultImports",
            type: "boolean",
            description: ts.Diagnostics.Allow_default_imports_from_modules_with_no_default_export_This_does_not_affect_code_emit_just_typechecking
        },
        {
            name: "allowJs",
            type: "boolean",
            description: ts.Diagnostics.Allow_javascript_files_to_be_compiled
        },
        {
            name: "noImplicitUseStrict",
            type: "boolean",
            description: ts.Diagnostics.Do_not_emit_use_strict_directives_in_module_output
        },
        {
            name: "noCustomAsyncPromise",
            type: "boolean",
            experimental: true
        }
    ];
    var optionNameMapCache;
    /* @internal */
    function getOptionNameMap() {
        if (optionNameMapCache) {
            return optionNameMapCache;
        }
        var optionNameMap = {};
        var shortOptionNames = {};
        ts.forEach(ts.optionDeclarations, function (option) {
            optionNameMap[option.name.toLowerCase()] = option;
            if (option.shortName) {
                shortOptionNames[option.shortName] = option.name;
            }
        });
        optionNameMapCache = { optionNameMap: optionNameMap, shortOptionNames: shortOptionNames };
        return optionNameMapCache;
    }
    ts.getOptionNameMap = getOptionNameMap;
    function parseCommandLine(commandLine, readFile) {
        var options = {};
        var fileNames = [];
        var errors = [];
        var _a = getOptionNameMap(), optionNameMap = _a.optionNameMap, shortOptionNames = _a.shortOptionNames;
        parseStrings(commandLine);
        return {
            options: options,
            fileNames: fileNames,
            errors: errors
        };
        function parseStrings(args) {
            var i = 0;
            while (i < args.length) {
                var s = args[i];
                i++;
                if (s.charCodeAt(0) === 64 /* at */) {
                    parseResponseFile(s.slice(1));
                }
                else if (s.charCodeAt(0) === 45 /* minus */) {
                    s = s.slice(s.charCodeAt(1) === 45 /* minus */ ? 2 : 1).toLowerCase();
                    // Try to translate short option names to their full equivalents.
                    if (ts.hasProperty(shortOptionNames, s)) {
                        s = shortOptionNames[s];
                    }
                    if (ts.hasProperty(optionNameMap, s)) {
                        var opt = optionNameMap[s];
                        // Check to see if no argument was provided (e.g. "--locale" is the last command-line argument).
                        if (!args[i] && opt.type !== "boolean") {
                            errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Compiler_option_0_expects_an_argument, opt.name));
                        }
                        switch (opt.type) {
                            case "number":
                                options[opt.name] = parseInt(args[i]);
                                i++;
                                break;
                            case "boolean":
                                options[opt.name] = true;
                                break;
                            case "string":
                                options[opt.name] = args[i] || "";
                                i++;
                                break;
                            // If not a primitive, the possible types are specified in what is effectively a map of options.
                            default:
                                var map_1 = opt.type;
                                var key = (args[i] || "").toLowerCase();
                                i++;
                                if (ts.hasProperty(map_1, key)) {
                                    options[opt.name] = map_1[key];
                                }
                                else {
                                    errors.push(ts.createCompilerDiagnostic(opt.error));
                                }
                        }
                    }
                    else {
                        errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Unknown_compiler_option_0, s));
                    }
                }
                else {
                    fileNames.push(s);
                }
            }
        }
        function parseResponseFile(fileName) {
            var text = readFile ? readFile(fileName) : ts.sys.readFile(fileName);
            if (!text) {
                errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.File_0_not_found, fileName));
                return;
            }
            var args = [];
            var pos = 0;
            while (true) {
                while (pos < text.length && text.charCodeAt(pos) <= 32 /* space */)
                    pos++;
                if (pos >= text.length)
                    break;
                var start = pos;
                if (text.charCodeAt(start) === 34 /* doubleQuote */) {
                    pos++;
                    while (pos < text.length && text.charCodeAt(pos) !== 34 /* doubleQuote */)
                        pos++;
                    if (pos < text.length) {
                        args.push(text.substring(start + 1, pos));
                        pos++;
                    }
                    else {
                        errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Unterminated_quoted_string_in_response_file_0, fileName));
                    }
                }
                else {
                    while (text.charCodeAt(pos) > 32 /* space */)
                        pos++;
                    args.push(text.substring(start, pos));
                }
            }
            parseStrings(args);
        }
    }
    ts.parseCommandLine = parseCommandLine;
    /**
      * Read tsconfig.json file
      * @param fileName The path to the config file
      */
    function readConfigFile(fileName, readFile) {
        var text = "";
        try {
            text = readFile(fileName);
        }
        catch (e) {
            return { error: ts.createCompilerDiagnostic(ts.Diagnostics.Cannot_read_file_0_Colon_1, fileName, e.message) };
        }
        return parseConfigFileTextToJson(fileName, text);
    }
    ts.readConfigFile = readConfigFile;
    /**
      * Parse the text of the tsconfig.json file
      * @param fileName The path to the config file
      * @param jsonText The text of the config file
      */
    function parseConfigFileTextToJson(fileName, jsonText) {
        try {
            var jsonTextWithoutComments = removeComments(jsonText);
            return { config: /\S/.test(jsonTextWithoutComments) ? JSON.parse(jsonTextWithoutComments) : {} };
        }
        catch (e) {
            return { error: ts.createCompilerDiagnostic(ts.Diagnostics.Failed_to_parse_file_0_Colon_1, fileName, e.message) };
        }
    }
    ts.parseConfigFileTextToJson = parseConfigFileTextToJson;
    /**
     * Remove the comments from a json like text.
     * Comments can be single line comments (starting with # or //) or multiline comments using / * * /
     *
     * This method replace comment content by whitespace rather than completely remove them to keep positions in json parsing error reporting accurate.
     */
    function removeComments(jsonText) {
        var output = "";
        var scanner = ts.createScanner(1 /* ES5 */, /* skipTrivia */ false, 0 /* Standard */, jsonText);
        var token;
        while ((token = scanner.scan()) !== 1 /* EndOfFileToken */) {
            switch (token) {
                case 2 /* SingleLineCommentTrivia */:
                case 3 /* MultiLineCommentTrivia */:
                    // replace comments with whitespace to preserve original character positions
                    output += scanner.getTokenText().replace(/\S/g, " ");
                    break;
                default:
                    output += scanner.getTokenText();
                    break;
            }
        }
        return output;
    }
    /**
      * Parse the contents of a config file (tsconfig.json).
      * @param json The contents of the config file to parse
      * @param host Instance of ParseConfigHost used to enumerate files in folder.
      * @param basePath A root directory to resolve relative path entries in the config
      *    file to. e.g. outDir
      */
    function parseJsonConfigFileContent(json, host, basePath, existingOptions, configFileName) {
        if (existingOptions === void 0) { existingOptions = {}; }
        var _a = convertCompilerOptionsFromJson(json["compilerOptions"], basePath, configFileName), optionsFromJsonConfigFile = _a.options, errors = _a.errors;
        var options = ts.extend(existingOptions, optionsFromJsonConfigFile);
        return {
            options: options,
            fileNames: getFileNames(),
            errors: errors
        };
        function getFileNames() {
            var fileNames = [];
            if (ts.hasProperty(json, "files")) {
                if (json["files"] instanceof Array) {
                    fileNames = ts.map(json["files"], function (s) { return ts.combinePaths(basePath, s); });
                }
                else {
                    errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Compiler_option_0_requires_a_value_of_type_1, "files", "Array"));
                }
            }
            else {
                var filesSeen = {};
                var exclude = [];
                if (json["exclude"] instanceof Array) {
                    exclude = json["exclude"];
                }
                else {
                    // by default exclude node_modules, and any specificied output directory
                    exclude = ["node_modules"];
                    var outDir = json["compilerOptions"] && json["compilerOptions"]["outDir"];
                    if (outDir) {
                        exclude.push(outDir);
                    }
                }
                exclude = ts.map(exclude, ts.normalizeSlashes);
                var supportedExtensions = ts.getSupportedExtensions(options);
                ts.Debug.assert(ts.indexOf(supportedExtensions, ".ts") < ts.indexOf(supportedExtensions, ".d.ts"), "Changed priority of extensions to pick");
                // Get files of supported extensions in their order of resolution
                for (var _i = 0, supportedExtensions_1 = supportedExtensions; _i < supportedExtensions_1.length; _i++) {
                    var extension = supportedExtensions_1[_i];
                    var filesInDirWithExtension = host.readDirectory(basePath, extension, exclude);
                    for (var _a = 0, filesInDirWithExtension_1 = filesInDirWithExtension; _a < filesInDirWithExtension_1.length; _a++) {
                        var fileName = filesInDirWithExtension_1[_a];
                        // .ts extension would read the .d.ts extension files too but since .d.ts is lower priority extension,
                        // lets pick them when its turn comes up
                        if (extension === ".ts" && ts.fileExtensionIs(fileName, ".d.ts")) {
                            continue;
                        }
                        // Skip over any minified JavaScript files (ending in ".min.js")
                        if (/\.min\.js$/.test(fileName)) {
                            continue;
                        }
                        // If this is one of the output extension (which would be .d.ts and .js if we are allowing compilation of js files)
                        // do not include this file if we included .ts or .tsx file with same base name as it could be output of the earlier compilation
                        if (extension === ".d.ts" || (options.allowJs && ts.contains(ts.supportedJavascriptExtensions, extension))) {
                            var baseName = fileName.substr(0, fileName.length - extension.length);
                            if (ts.hasProperty(filesSeen, baseName + ".ts") || ts.hasProperty(filesSeen, baseName + ".tsx")) {
                                continue;
                            }
                        }
                        filesSeen[fileName] = true;
                        fileNames.push(fileName);
                    }
                }
            }
            return fileNames;
        }
    }
    ts.parseJsonConfigFileContent = parseJsonConfigFileContent;
    function convertCompilerOptionsFromJson(jsonOptions, basePath, configFileName) {
        var options = {};
        var errors = [];
        if (configFileName && ts.getBaseFileName(configFileName) === "jsconfig.json") {
            options.allowJs = true;
        }
        if (!jsonOptions) {
            return { options: options, errors: errors };
        }
        var optionNameMap = ts.arrayToMap(ts.optionDeclarations, function (opt) { return opt.name; });
        for (var id in jsonOptions) {
            if (ts.hasProperty(optionNameMap, id)) {
                var opt = optionNameMap[id];
                var optType = opt.type;
                var value = jsonOptions[id];
                var expectedType = typeof optType === "string" ? optType : "string";
                if (typeof value === expectedType) {
                    if (typeof optType !== "string") {
                        var key = value.toLowerCase();
                        if (ts.hasProperty(optType, key)) {
                            value = optType[key];
                        }
                        else {
                            errors.push(ts.createCompilerDiagnostic(opt.error));
                            value = 0;
                        }
                    }
                    if (opt.isFilePath) {
                        value = ts.normalizePath(ts.combinePaths(basePath, value));
                        if (value === "") {
                            value = ".";
                        }
                    }
                    options[opt.name] = value;
                }
                else {
                    errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Compiler_option_0_requires_a_value_of_type_1, id, expectedType));
                }
            }
            else {
                errors.push(ts.createCompilerDiagnostic(ts.Diagnostics.Unknown_compiler_option_0, id));
            }
        }
        return { options: options, errors: errors };
    }
    ts.convertCompilerOptionsFromJson = convertCompilerOptionsFromJson;
})(ts || (ts = {}));
