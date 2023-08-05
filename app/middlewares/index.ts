import { PageDirectory } from "../pages.js";

export const page = ((req, res, next) => {
    const path = req.originalUrl == "/" ? 'index' : req.originalUrl.substring(1);
    res.locals.path = path;

    const page = PageDirectory.get(path);
    
    if (!page) {
        next();
        return;
    }

    res.locals.page = page;
    next();
});
