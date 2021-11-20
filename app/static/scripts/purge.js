$(() => {
    $('#confirm').click(() => {
        let page = $('#confirm').data('page');
        $.ajax({
            type: 'GET',
            url: `/special/purge/${page}/confirm`,
            success: () => {
                $('#response').html('<div class=\'box\'>Successfully purged page.</div>');
            },
            error: () => {
                $('#response').html('<div class=\'box\'>Could not purge page. Try again later.</div>');
            }
        });
    });
});
