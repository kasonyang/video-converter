declare interface FFmpegConvertOptions {
    inputFile: string;
    outputFile: string;
    outputHeight?: number;
}

declare function ffmpeg_convert(
    options: FFmpegConvertOptions,
    callback: (status: "progress" | "error" | "end", param: any) => any
): void;