function update_listings(data){

    if (!data.length){$("#postings").empty(); reset_navigation();}
    else {
        listing_total_count = parseInt(data[0]["total_count"]);
        if (current_page === 0) current_page = 1;
        let item = `<div class='col-md-3'><div class='post'>
                        <div class='title'><img src='/static/images/info.png' onclick='post_details(this);' id='{10}'><a target='_blank' href='{5}'>{6}</a></div>
                        <div class='make'><span class="headers">make</span><span class="value">{0}</span></div> 
                        <div class='model'><span class="headers">model</span><span class="value">{1}</span></div> 
                        <div class='trim'><span class="headers">trim</span><span class="value">{7}</span></div> 
                        <div class='series'><span class="headers">series</span><span class="value">{8}</span></div> 
                        <div class='year'><span class="headers">year</span><span class="value">{2}</span></div> 
                        <div class='condition'><span class="headers">condition</span><span class="value">{9}</span></div> 
                        <div class='mileage'><span class="headers">mileage</span><span class="value">{3}</span></div> 
                        <div class='price'><span class="headers">price</span><span class="value">{4}</span></div> 
                    </div></div>`;

        $("#postings").empty().append(`<div class="col-md-12" id="postings_title">Search Results</div>`);
        data.forEach(function(e){
            let make = e["make"];
            let model = (e["model_clean"] == null ? (e["model"] == null ? "unknown" : e["model"]) : e["model_clean"]).substr(0,25).replace(/ +$/,"");
            let trim = (e["trim_clean"] == null ? (e["trim"] == null ? "unknown" : e["trim"]) : e["trim_clean"]).substr(0,25).replace(/ +$/,"");
            let series = (e["series_clean"] == null ? (e["series"] == null ? "unknown" : e["series"]) : e["series_clean"]).substr(0,25).replace(/ +$/,"");
            let year = (e["year"] == null ? "unknown" : e["year"]);
            let mileage = (e["mileage"] == null ? "unknown" : e["mileage"]);
            let price = (e["price"] == null ? "unknown" : "$" + e["price"]);
            let condition = (e["condition"] == null ? "unknown" : e["condition"]);
            let url = e["url"];
            let title = e["title"];
            let puid = e["puid"];
            $("#postings").append(item.format(make, model, year, mileage, price, url, title.substr(0,33).replace(/ +$/,""), trim, series, condition, puid));
        });
        update_navbar();
        $("#content").show();
    }
}

function close_details(){
    if ($("#details").length) $("#details").remove();
}

function post_details(post){

    let puid = $(post).attr('id');
    let detail_item = `<div class='col-md-12' id="details">   
                            <div id="details_title">
                                <span class="headers"><img src='/static/images/close.png' onclick='close_details();'></span>
                                <span class="value">{0}</span>
                            </div><div class="row"> 
                        <div class='col-md-6'>
                            <div class='post'>
                                {1}
                            </div>
                        </div>
                        <div class='col-md-6'>
                            <div class='post'>
                                <div>
                                    <span style="width: 100%;text-align: left;font-variant: all-petite-caps;">date</span>
                                    <span style="width: 100%;text-align: center;font-variant: all-petite-caps;">post history</span>
                                    <span style="width: 100%;text-align: right;font-variant: all-petite-caps;">price</span>
                                </div>
                                {2}
                            </div>
                        </div>
                    </div></div>`;


    let info_item = `<div class='{0}'><span class="headers">{0}</span><span class="value">{1}</span></div>`;
    let history_item = `<div class='series'><span class="headers">{0}</span><span class="value"><a href='{2}'>{1}</a></span></div>`;

    jQuery.get( "api/get_details", {puid: puid}, function(data){

        let evolution = [];
        let detailed_info = {};
        for (let i = 0; i < data.length; i++){
            let e = data[i];
            evolution.push({post_date: e.post_date_h, price: e.price, url: e.url});
            let keys = Object.keys(e);
            for (j = 0; j < keys.length; j++){
                let key = keys[j];
                if (e[key] != null) detailed_info[key] = e[key];
            }
        }

        let info_lines = '';
        let info_keys = Object.keys(detailed_info);
        for (let i = 0; i < info_keys.length; i++){
            let k = info_keys[i];
            let v = detailed_info[k];

            // Treat individual cases
            if (v.length === 0) continue;
            if (["model", "trim", "series" ,"geo", "puid", "url", "update", "title", "post_date", "post_date_h", "expired"].indexOf(k) !== -1) continue;
            else if (k === "model_clean") k = "model";
            else if (k === "top_speed") v = String(v) + " MPH";
            else if (k === "trim_clean") k = "trim";
            else if (k === "series_clean") k = "series";
            else if (k === "price" || k === "base_price") v = "$" + String(v);
            else if (k === "displacement") v = String(v) + " L";
            else if (k === "engine_power" || k === "brake_hp") v = String(v) + " HP";
            else if (["wheel_base_length", "front_wheel_size", "rear_wheel_size"].indexOf(k) !== -1) v = String(v) + "\"";

            info_lines += info_item.format(k,v);
        }

        let history_str = '';
        for (let i = 0; i < evolution.length; i++){
            let hist = evolution[i];
            history_str += history_item.format(hist.post_date, (hist.price == null ? "unknown" : "$"+hist.price), hist.url);
        }

        if ($("#details").length) $("#details").remove();

        $(post).parents(".col-md-3").after(detail_item.format(detailed_info["title"], info_lines, history_str));
    });
}