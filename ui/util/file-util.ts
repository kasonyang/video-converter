export function getFileName(path: string) {
    if (path.endsWith("/")) {
        return "";
    }
    const parts = path.split("/");
    return parts[parts.length - 1];
}

export function removeExt(name: string) {
    let parts = name.split(".");
    parts.splice(parts.length - 1, 1);
    return parts.join(".");
}