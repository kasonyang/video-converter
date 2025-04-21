// Hack for webpack-dev-server
(function hackWebpackDevServer() {
    globalThis.location = "http://localhost:7800/";
    globalThis.document = {
        currentScript: {
            src: globalThis.location,
            tagName: 'script',
        },
        createElement(tag) {
            const tagName = tag.toUpperCase();
            if (tagName === "STYLE") {
                return {
                    tagName,
                    styleSheet: {
                        set cssText(css) {
                            navigator.stylesheet.append(css);
                        }
                    },
                }
            }
            return {
                tagName,
                setAttribute() {},
            }
        },
        getElementsByTagName() {
            return [];
        },
        head: {
            appendChild(node) {
                if (node.tagName === "SCRIPT") {
                    import(node.src).then(node.onload).catch(node.onerror);
                }
            }
        }
    }
    globalThis.self = {
        postMessage() {

        },
        addEventListener() {

        },
        location: {
            reload() {
                process.exit(1);
            },
            hostname: "localhost",
            protocol: "http",
            port: 7800,
            href: "",
            search: "",
            toString() {
                return "http://localhost:7800/"
            }
        },
        setInterval() {

        }
    };

    class FetchResponse {
        _resp;
        constructor(resp) {
            this._resp = resp;
            this.status = resp.status;
            this.ok = this.status >= 200 && this.status < 300;
        }
        async json() {
            const result = JSON.parse(this._resp.body);
            console.log("result", result);
            return result;
        }

    }

    async function fetch(url) {
        const resp = await http_request(url);
        return new FetchResponse(resp);
    }
    globalThis.fetch = fetch;
})();