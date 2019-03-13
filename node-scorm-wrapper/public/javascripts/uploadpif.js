$(function () {
    var responseData = {};

    $('#scormpif').on('change', function () {
        $('#uploads').empty();
        $('#uploadBtn').prop('disabled', false);
    });

    $(document).on('click', '.launchcourse', function () {
        event.preventDefault();

        var form = $(document.createElement('form'));
        $(form).attr("action", "/wrapper");
        $(form).attr("method", "POST");
        $(form).attr("target", "_blank");
    
        var input = $("<input>").attr("type", "hidden").attr("name", "response").val(JSON.stringify(responseData));
        $(form).append($(input));
        
        form.appendTo( document.body );

        $(form).submit().remove();
        return false;
    });

    $('#scormpifupload').on('submit', function (event) {
        event.preventDefault();

        $('#uploadBtn').prop('disabled', true);

        var data = new FormData(this);

        $('.progress').css({
            display: 'block'
        });

        $.ajax({
            type: 'POST',
            url: $(this).attr('action'),
            data: data,
            cache: false,
            contentType: false,
            processData: false,
            dataType: "json"
            })
            .done(function (response) {
                var data = $.parseJSON(response);

                $('#scormpifupload')[0].reset();

                if (data.success) {
                    responseData = data;
                    var template = '<div class="col m4 offset-m4"><div class="card-panel teal"><span class="white-text launchcourse">' + data.title + '</span></div></div>';
                    $('.img-preview').append(template);
                    //$('#launchBtn').prop('disabled', false);
                } else {
                    responseData = {};
                    for (var i = 0; i < data.errors.length; i++) {
                        var template2 = '<div class="col m4 offset-m4"><div class="card-panel red"><p><span class="white-text">Error</span></p><span class="white-text">' + data.errors[i] + '</span></div></div>';
                        $('.img-preview').append(template2);
                    }
                }
                
                $('.progress').css({
                    display: 'none'
                });
            })
            .fail(function (err) {
                $('.progress').css({
                    display: 'none'
                });
            });

    });
});