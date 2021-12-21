export const navbar = ((req, res, next) => {
    let navbar = '';
    res.locals.directory.primaryPages.forEach(page => {
        navbar += `<div class="navbar-element"><a href="/${page.standardName}"${(req.params.page ?? '' )== page.standardName ? ' class="highlight"' : ''}>${page.metadata.displayTitle}</a></div>`;
    })
    res.locals.navbarHtml = navbar;
    next();
});

export const page = ((req, res, next) => {
    let path = req.params.page ?? 'index';
    res.locals.path = path;

    let page = res.locals.directory.get(path);

    if (!page) {
        next();
        return;
    }

    res.locals.page = page;
    next();
});
