import { PageDirectory } from "../pages.js";

export const blogs = (pageDirectory: PageDirectory) => {
    return ((req, res, next) => {
        let blogs = [];
        for (const page of Object.values(pageDirectory.pages)) {
            if (page.route.startsWith('blog/')) {
                blogs.push(page);
            }
        }
        
        blogs.sort((a, b) => {
            return b.metadata.date.getTime() - a.metadata.date.getTime();
        });
        
        res.locals.blogs = blogs;
        next();
    });
}
