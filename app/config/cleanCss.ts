import CleanCSS from "clean-css";

export const minify = new CleanCSS({ returnPromise: true }).minify;
