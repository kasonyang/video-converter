import App from "./app";
import React from "react";
import {render} from "deft-react";

function initWindow(): Window {
    const window = globalThis.mainWindow || (globalThis.mainWindow = new Window({
        title: 'VideoConverter',
        width: 800,
        height: 600,
    }));
    window.bindResize((e: IResizeEvent) => {
        console.log("window resized", e);
    });
    return window;
}

function main() {
    const window = initWindow();
    render(window, React.createElement(App))
}

main();

/// Hot reload support
//@ts-ignore
module.hot && module.hot.accept();
