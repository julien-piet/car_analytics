function get_price(){
    let mileage = $("#price_analytics input[name='mileage']").val();
    let year = $("#price_analytics input[name='year']").val();
    let make = latest_query["make"];
    let model = latest_query["model"];
    let query;
    if (model) { query = {make: make, model: model, year: year, mileage: mileage} }
    else { query = {make: make, year: year, mileage: mileage}}
    jQuery.get("api/get_price", query, update_guessed_price);
}

function update_guessed_price(data){
    let value = data[0];
    $('.computed_price').html("$ {0}".format(value));
}

function update_price_analytics(query){

    let make = query["make"];
    let model = query["model"];
    let price_analytics = $("#price_analytics");

    price_analytics.empty();
    if(!(make && make.length)){return;}

    let fields = `<div class="row">
        <div class="col-md-8">
            <div class="row">
                <div class="col-md-6">
                     <div class='analytics_wrapper'><span class="headers">make</span><span class="value">{0}</span></div>
                </div>
                <div class="col-md-6">
                     <div class='analytics_wrapper'><span class="headers">year</span><span class="value"><input type="number" name="year" placeholder="year" onchange="get_price();"/></span></div>
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                     <div class='analytics_wrapper'><span class="headers">model</span><span class="value">{1}</span></div>
                </div>
                <div class="col-md-6">
                     <div class='analytics_wrapper'><span class="headers">mileage</span><span class="value"><input type="number" name="mileage" placeholder="mileage" onchange="get_price();"/></span></div>
                </div>
            </div>
        </div>
        <div class="col-md-4">
            <div class="computed_price">$ 0</div>
        </div>
    </div>`.format(make, model);
    price_analytics.append(`<div class="col-md-12" id="postings_title">Analytics</div>`).append(fields);
}