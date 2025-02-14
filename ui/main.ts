import {DeftWindow} from "deft-react";
import {App} from "./app";
import React from "react";

function initWindow(): DeftWindow {
    const window = globalThis.mainWindow || (globalThis.mainWindow = new DeftWindow({
        title: 'Deft App',
    }));
    window.bindResize((e: IResizeEvent) => {
        console.log("window resized", e);
    });
    return window;
}

function main() {
    const window = initWindow();
    window.newPage(React.createElement(App))
}

main();

/// Hot reload support
//@ts-ignore
module.hot && module.hot.accept();
