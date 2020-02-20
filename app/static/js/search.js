(function() {

    // Initialize search bar

    let query_bar = $(".query_bar");
    let advance_bar = $(".advance_bar");
    let expand = $("#expand");
    let retract = $("#retract");
    let make_input = $('.bar input[name="make"]');
    let model_input = $('.bar input[name="model"]');

    let models = {};

    query_bar.hide();
    advance_bar.hide();
    retract.hide();

    expand.click(function (e) {
        query_bar.show();
        advance_bar.show();
        retract.show();
        expand.hide();
    });

    retract.click(function (e) {
        query_bar.hide();
        advance_bar.hide();
        retract.hide();
        expand.show();
    });

    // Define formatting for models, trims and series
    function generate_popup_list(name, content_array) {

        // Remove null
        let content_array_filtered = [];
        for (let i = 0; i < content_array.length; i++) {
            if (content_array[i] && content_array[i] !== "null") content_array_filtered.push(content_array[i]);
        }
        content_array = content_array_filtered;

        let content = "<div class='popup_list {0}_list'>";
        for (let i = 0; i < content_array.length; i++) {
            content += "<span onclick='update_field(\"{0}\", this)'>{" + String(i + 1) + "}</br></span>";
        }
        content += "</div>";
        if (!content_array.length) return "No available {0}".format(name);
        else return content.format(name, ...content_array);
    }

    // Setup ajax to fetch models, series and trims
    make_input.on("change", function (e) {

        // Load models
        if (this.value) {
            let params = {make: this.value};
            models = {"Loading...": [{trim: "Loading...", series: "Loading..."}]};
            jQuery.get("api/get_models", params, function (e) {
                models = {};
                for (let i = 0; i < e.length; i++) {
                    let item = e[i];
                    if (!(item.model in models)) {
                        models[item.model] = [];
                    }
                    if (item.trim || item.series) models[item.model].push({trim: item.trim, series: item.series})
                }

            });
        }
    });

    // Setup help popups
    tippy('#help_make', {
        trigger: "click", content: "TEST", interactive: true, onTrigger(instance, event) {
            // Generate makes
            instance.setContent(generate_popup_list("make", makes));
        }
    });
    tippy('#help_model', {
        trigger: "click", content: "TEST", interactive: true, onTrigger(instance, event) {
            // Generate makes
            if (!(make_input[0].value)) models = {};
            instance.setContent(generate_popup_list("model", Object.keys(models)));
        }
    });
    tippy('#help_trim', {
        trigger: "click", content: "TEST", interactive: true, onTrigger(instance, event) {
            // Generate makes
            let data = {};
            let model = model_input[0].value.toLowerCase();
            if (model in models) {
                for (let i = 0; i < models[model].length; i++) {
                    if (models[model][i].trim) data[models[model][i].trim] = 0;
                }
                instance.setContent(generate_popup_list("trim", Object.keys(data)));
            }

        }
    });
    tippy('#help_series', {
        trigger: "click", content: "TEST", interactive: true, onTrigger(instance, event) {
            // Generate makes
            let data = {};
            let model = model_input[0].value.toLowerCase();
            if (model in models) {
                for (let i = 0; i < models[model].length; i++) {
                    if (models[model][i].series) data[models[model][i].series] = 0;
                }
                instance.setContent(generate_popup_list("series", Object.keys(data)));
            }
        }
    });

})();

// Globally accessible functions

function update_field(name, e) {
    let field = $('.bar input[name="' + name + '"]');
    field[0].value = $(e).text().toLowerCase();
    field.trigger('change');
}