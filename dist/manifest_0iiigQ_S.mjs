import './chunks/astro_B3nXbBG9.mjs';

if (typeof process !== "undefined") {
  let proc = process;
  if ("argv" in proc && Array.isArray(proc.argv)) {
    if (proc.argv.includes("--verbose")) ; else if (proc.argv.includes("--silent")) ; else ;
  }
}

/**
 * Tokenize input string.
 */
function lexer(str) {
    var tokens = [];
    var i = 0;
    while (i < str.length) {
        var char = str[i];
        if (char === "*" || char === "+" || char === "?") {
            tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
            continue;
        }
        if (char === "\\") {
            tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
            continue;
        }
        if (char === "{") {
            tokens.push({ type: "OPEN", index: i, value: str[i++] });
            continue;
        }
        if (char === "}") {
            tokens.push({ type: "CLOSE", index: i, value: str[i++] });
            continue;
        }
        if (char === ":") {
            var name = "";
            var j = i + 1;
            while (j < str.length) {
                var code = str.charCodeAt(j);
                if (
                // `0-9`
                (code >= 48 && code <= 57) ||
                    // `A-Z`
                    (code >= 65 && code <= 90) ||
                    // `a-z`
                    (code >= 97 && code <= 122) ||
                    // `_`
                    code === 95) {
                    name += str[j++];
                    continue;
                }
                break;
            }
            if (!name)
                throw new TypeError("Missing parameter name at ".concat(i));
            tokens.push({ type: "NAME", index: i, value: name });
            i = j;
            continue;
        }
        if (char === "(") {
            var count = 1;
            var pattern = "";
            var j = i + 1;
            if (str[j] === "?") {
                throw new TypeError("Pattern cannot start with \"?\" at ".concat(j));
            }
            while (j < str.length) {
                if (str[j] === "\\") {
                    pattern += str[j++] + str[j++];
                    continue;
                }
                if (str[j] === ")") {
                    count--;
                    if (count === 0) {
                        j++;
                        break;
                    }
                }
                else if (str[j] === "(") {
                    count++;
                    if (str[j + 1] !== "?") {
                        throw new TypeError("Capturing groups are not allowed at ".concat(j));
                    }
                }
                pattern += str[j++];
            }
            if (count)
                throw new TypeError("Unbalanced pattern at ".concat(i));
            if (!pattern)
                throw new TypeError("Missing pattern at ".concat(i));
            tokens.push({ type: "PATTERN", index: i, value: pattern });
            i = j;
            continue;
        }
        tokens.push({ type: "CHAR", index: i, value: str[i++] });
    }
    tokens.push({ type: "END", index: i, value: "" });
    return tokens;
}
/**
 * Parse a string for the raw tokens.
 */
function parse(str, options) {
    if (options === void 0) { options = {}; }
    var tokens = lexer(str);
    var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a;
    var defaultPattern = "[^".concat(escapeString(options.delimiter || "/#?"), "]+?");
    var result = [];
    var key = 0;
    var i = 0;
    var path = "";
    var tryConsume = function (type) {
        if (i < tokens.length && tokens[i].type === type)
            return tokens[i++].value;
    };
    var mustConsume = function (type) {
        var value = tryConsume(type);
        if (value !== undefined)
            return value;
        var _a = tokens[i], nextType = _a.type, index = _a.index;
        throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
    };
    var consumeText = function () {
        var result = "";
        var value;
        while ((value = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR"))) {
            result += value;
        }
        return result;
    };
    while (i < tokens.length) {
        var char = tryConsume("CHAR");
        var name = tryConsume("NAME");
        var pattern = tryConsume("PATTERN");
        if (name || pattern) {
            var prefix = char || "";
            if (prefixes.indexOf(prefix) === -1) {
                path += prefix;
                prefix = "";
            }
            if (path) {
                result.push(path);
                path = "";
            }
            result.push({
                name: name || key++,
                prefix: prefix,
                suffix: "",
                pattern: pattern || defaultPattern,
                modifier: tryConsume("MODIFIER") || "",
            });
            continue;
        }
        var value = char || tryConsume("ESCAPED_CHAR");
        if (value) {
            path += value;
            continue;
        }
        if (path) {
            result.push(path);
            path = "";
        }
        var open = tryConsume("OPEN");
        if (open) {
            var prefix = consumeText();
            var name_1 = tryConsume("NAME") || "";
            var pattern_1 = tryConsume("PATTERN") || "";
            var suffix = consumeText();
            mustConsume("CLOSE");
            result.push({
                name: name_1 || (pattern_1 ? key++ : ""),
                pattern: name_1 && !pattern_1 ? defaultPattern : pattern_1,
                prefix: prefix,
                suffix: suffix,
                modifier: tryConsume("MODIFIER") || "",
            });
            continue;
        }
        mustConsume("END");
    }
    return result;
}
/**
 * Compile a string to a template function for the path.
 */
function compile(str, options) {
    return tokensToFunction(parse(str, options), options);
}
/**
 * Expose a method for transforming tokens into the path function.
 */
function tokensToFunction(tokens, options) {
    if (options === void 0) { options = {}; }
    var reFlags = flags(options);
    var _a = options.encode, encode = _a === void 0 ? function (x) { return x; } : _a, _b = options.validate, validate = _b === void 0 ? true : _b;
    // Compile all the tokens into regexps.
    var matches = tokens.map(function (token) {
        if (typeof token === "object") {
            return new RegExp("^(?:".concat(token.pattern, ")$"), reFlags);
        }
    });
    return function (data) {
        var path = "";
        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            if (typeof token === "string") {
                path += token;
                continue;
            }
            var value = data ? data[token.name] : undefined;
            var optional = token.modifier === "?" || token.modifier === "*";
            var repeat = token.modifier === "*" || token.modifier === "+";
            if (Array.isArray(value)) {
                if (!repeat) {
                    throw new TypeError("Expected \"".concat(token.name, "\" to not repeat, but got an array"));
                }
                if (value.length === 0) {
                    if (optional)
                        continue;
                    throw new TypeError("Expected \"".concat(token.name, "\" to not be empty"));
                }
                for (var j = 0; j < value.length; j++) {
                    var segment = encode(value[j], token);
                    if (validate && !matches[i].test(segment)) {
                        throw new TypeError("Expected all \"".concat(token.name, "\" to match \"").concat(token.pattern, "\", but got \"").concat(segment, "\""));
                    }
                    path += token.prefix + segment + token.suffix;
                }
                continue;
            }
            if (typeof value === "string" || typeof value === "number") {
                var segment = encode(String(value), token);
                if (validate && !matches[i].test(segment)) {
                    throw new TypeError("Expected \"".concat(token.name, "\" to match \"").concat(token.pattern, "\", but got \"").concat(segment, "\""));
                }
                path += token.prefix + segment + token.suffix;
                continue;
            }
            if (optional)
                continue;
            var typeOfMessage = repeat ? "an array" : "a string";
            throw new TypeError("Expected \"".concat(token.name, "\" to be ").concat(typeOfMessage));
        }
        return path;
    };
}
/**
 * Escape a regular expression string.
 */
function escapeString(str) {
    return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
/**
 * Get the flags for a regexp from the options.
 */
function flags(options) {
    return options && options.sensitive ? "" : "i";
}

function getRouteGenerator(segments, addTrailingSlash) {
  const template = segments.map((segment) => {
    return "/" + segment.map((part) => {
      if (part.spread) {
        return `:${part.content.slice(3)}(.*)?`;
      } else if (part.dynamic) {
        return `:${part.content}`;
      } else {
        return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
    }).join("");
  }).join("");
  let trailing = "";
  if (addTrailingSlash === "always" && segments.length) {
    trailing = "/";
  }
  const toPath = compile(template + trailing);
  return toPath;
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    })
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  return {
    ...serializedManifest,
    assets,
    componentMetadata,
    clientDirectives,
    routes
  };
}

const manifest = deserializeManifest({"adapterName":"","routes":[{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/myBlog/_astro/about.yfSa3bAW.css"}],"routeData":{"route":"/","type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/myBlog/_astro/about.yfSa3bAW.css"}],"routeData":{"route":"/category","type":"page","pattern":"^\\/category\\/?$","segments":[[{"content":"category","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/category/index.astro","pathname":"/category","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/myBlog/_astro/about.yfSa3bAW.css"}],"routeData":{"route":"/category/[...category]","type":"page","pattern":"^\\/category(?:\\/(.*?))?\\/?$","segments":[[{"content":"category","dynamic":false,"spread":false}],[{"content":"...category","dynamic":true,"spread":true}]],"params":["...category"],"component":"src/pages/category/[...category].astro","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/mainkami","type":"endpoint","pattern":"^\\/mainkami$","segments":[[{"content":"mainkami","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/mainkami.ts","pathname":"/mainkami","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/myBlog/_astro/about.yfSa3bAW.css"}],"routeData":{"route":"/archive","type":"page","pattern":"^\\/archive\\/?$","segments":[[{"content":"archive","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/archive.astro","pathname":"/archive","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/rss.xml","type":"endpoint","pattern":"^\\/rss\\.xml$","segments":[[{"content":"rss.xml","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/rss.xml.js","pathname":"/rss.xml","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/myBlog/_astro/about.yfSa3bAW.css"}],"routeData":{"route":"/about","type":"page","pattern":"^\\/about\\/?$","segments":[[{"content":"about","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/about.astro","pathname":"/about","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/myBlog/_astro/about.yfSa3bAW.css"}],"routeData":{"route":"/blog/[...slug]","type":"page","pattern":"^\\/blog(?:\\/(.*?))?\\/?$","segments":[[{"content":"blog","dynamic":false,"spread":false}],[{"content":"...slug","dynamic":true,"spread":true}]],"params":["...slug"],"component":"src/pages/blog/[...slug].astro","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/myBlog/_astro/about.yfSa3bAW.css"}],"routeData":{"route":"/tag","type":"page","pattern":"^\\/tag\\/?$","segments":[[{"content":"tag","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/tag/index.astro","pathname":"/tag","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/myBlog/_astro/about.yfSa3bAW.css"}],"routeData":{"route":"/tag/[...tag]","type":"page","pattern":"^\\/tag(?:\\/(.*?))?\\/?$","segments":[[{"content":"tag","dynamic":false,"spread":false}],[{"content":"...tag","dynamic":true,"spread":true}]],"params":["...tag"],"component":"src/pages/tag/[...tag].astro","prerender":false,"fallbackRoutes":[],"_meta":{"trailingSlash":"ignore"}}}],"site":"https://example.com","base":"/myBlog","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["D:/001DEVs/MyStaticBlog/astro/demo/src/pages/about.astro",{"propagation":"in-tree","containsHead":true}],["D:/001DEVs/MyStaticBlog/astro/demo/src/pages/archive.astro",{"propagation":"in-tree","containsHead":true}],["D:/001DEVs/MyStaticBlog/astro/demo/src/pages/blog/[...slug].astro",{"propagation":"in-tree","containsHead":true}],["D:/001DEVs/MyStaticBlog/astro/demo/src/pages/category/[...category].astro",{"propagation":"in-tree","containsHead":true}],["D:/001DEVs/MyStaticBlog/astro/demo/src/pages/category/index.astro",{"propagation":"in-tree","containsHead":true}],["D:/001DEVs/MyStaticBlog/astro/demo/src/pages/index.astro",{"propagation":"in-tree","containsHead":true}],["D:/001DEVs/MyStaticBlog/astro/demo/src/pages/tag/[...tag].astro",{"propagation":"in-tree","containsHead":true}],["D:/001DEVs/MyStaticBlog/astro/demo/src/pages/tag/index.astro",{"propagation":"in-tree","containsHead":true}],["\u0000astro:content",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/blog/[...slug]@_@astro",{"propagation":"in-tree","containsHead":false}],["D:/001DEVs/MyStaticBlog/astro/demo/src/pages/mainkami.ts",{"propagation":"in-tree","containsHead":false}],["D:/001DEVs/MyStaticBlog/astro/demo/src/components/CategoryItems.astro",{"propagation":"in-tree","containsHead":false}],["D:/001DEVs/MyStaticBlog/astro/demo/src/components/CategoryCard.astro",{"propagation":"in-tree","containsHead":false}],["D:/001DEVs/MyStaticBlog/astro/demo/src/layouts/WebRoot.astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/about@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/archive@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/category/[...category]@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/category/index@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/index@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/tag/[...tag]@_@astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/tag/index@_@astro",{"propagation":"in-tree","containsHead":false}],["D:/001DEVs/MyStaticBlog/astro/demo/src/components/Overview.astro",{"propagation":"in-tree","containsHead":false}],["D:/001DEVs/MyStaticBlog/astro/demo/src/components/TagItems.astro",{"propagation":"in-tree","containsHead":false}],["D:/001DEVs/MyStaticBlog/astro/demo/src/components/TagCard.astro",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/mainkami@_@ts",{"propagation":"in-tree","containsHead":false}],["D:/001DEVs/MyStaticBlog/astro/demo/src/pages/rss.xml.js",{"propagation":"in-tree","containsHead":false}],["\u0000@astro-page:src/pages/rss.xml@_@js",{"propagation":"in-tree","containsHead":false}]],"renderers":[],"clientDirectives":[["idle","(()=>{var i=t=>{let e=async()=>{await(await t())()};\"requestIdleCallback\"in window?window.requestIdleCallback(e):setTimeout(e,200)};(self.Astro||(self.Astro={})).idle=i;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var s=(i,t)=>{let a=async()=>{await(await i())()};if(t.value){let e=matchMedia(t.value);e.matches?a():e.addEventListener(\"change\",a,{once:!0})}};(self.Astro||(self.Astro={})).media=s;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var r=(i,c,s)=>{let n=async()=>{await(await i())()},t=new IntersectionObserver(e=>{for(let o of e)if(o.isIntersecting){t.disconnect(),n();break}});for(let e of s.children)t.observe(e)};(self.Astro||(self.Astro={})).visible=r;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astro-page:src/pages/category/index@_@astro":"pages/category.astro.mjs","\u0000@astro-page:src/pages/category/[...category]@_@astro":"pages/category/_---category_.astro.mjs","\u0000@astro-page:src/pages/mainkami@_@ts":"pages/mainkami.astro.mjs","\u0000@astro-page:src/pages/archive@_@astro":"pages/archive.astro.mjs","\u0000@astro-page:src/pages/rss.xml@_@js":"pages/rss.xml.astro.mjs","\u0000@astro-page:src/pages/about@_@astro":"pages/about.astro.mjs","\u0000@astro-page:src/pages/blog/[...slug]@_@astro":"pages/blog/_---slug_.astro.mjs","\u0000@astro-page:src/pages/tag/index@_@astro":"pages/tag.astro.mjs","\u0000@astro-page:src/pages/tag/[...tag]@_@astro":"pages/tag/_---tag_.astro.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000empty-middleware":"_empty-middleware.mjs","/src/pages/tag/[...tag].astro":"chunks/pages/__bsGXMUlF.mjs","/src/pages/about.astro":"chunks/pages/about_iG4vPyha.mjs","/src/pages/archive.astro":"chunks/pages/archive_17CNNGUE.mjs","/src/pages/mainkami.ts":"chunks/pages/mainkami_w-QjPElg.mjs","/src/pages/rss.xml.js":"chunks/pages/rss_5vOfnCrR.mjs","\u0000@astrojs-manifest":"manifest_0iiigQ_S.mjs","D:/001DEVs/MyStaticBlog/astro/demo/src/content/blog/基于astro的blog.md?astroContentCollectionEntry=true":"chunks/基于astro的blog_ZTDV60Nq.mjs","D:/001DEVs/MyStaticBlog/astro/demo/src/content/blog/扇贝web clone.md?astroContentCollectionEntry=true":"chunks/扇贝web clone_VPPdbtCZ.mjs","D:/001DEVs/MyStaticBlog/astro/demo/src/content/blog/基于astro的blog.md?astroPropagatedAssets":"chunks/基于astro的blog_3LujPZUV.mjs","D:/001DEVs/MyStaticBlog/astro/demo/src/content/blog/扇贝web clone.md?astroPropagatedAssets":"chunks/扇贝web clone_mRilzWUp.mjs","D:/001DEVs/MyStaticBlog/astro/demo/src/content/blog/基于astro的blog.md":"chunks/基于astro的blog_bK-DNu5T.mjs","D:/001DEVs/MyStaticBlog/astro/demo/src/content/blog/扇贝web clone.md":"chunks/扇贝web clone_FlUB9aUG.mjs","astro:scripts/before-hydration.js":""},"assets":[]});

export { manifest };
