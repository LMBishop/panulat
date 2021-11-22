$(() => {
    $('#confirm').click(() => {
        $.ajax({
            type: 'GET',
            url: `/special/rebuild/confirm`,
            success: () => {
                $('#response').html('<div class=\'box\'>Successfully rebuilt page directory.</div>');
            },
            error: () => {
                $('#response').html('<div class=\'box\'>Could not rebuild page directory. Try again later.</div>');
            }
        });
    });
});
