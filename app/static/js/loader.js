$(".query_bar").hide()
$(".advance_bar").hide()
$("#retract").hide()

$("#expand").click(function(e){

    $(".query_bar").show()
    $(".advance_bar").show()
    $("#retract").show()
    $("#expand").hide()

});


$("#retract").click(function(e){

    $(".query_bar").hide()
    $(".advance_bar").hide()
    $("#retract").hide()
    $("#expand").show()

});


var listing_total_count = 0;
var current_page = 0;
latest_query = {};
const page_size = 52;
$("#navbar").hide();

// Load list of makes 
makes = []
models = {}
comp_vars = ["price", "mileage"]

jQuery.get( "api/get_makes", function(e){
    makes = e;
});

tippy('#help_make', {trigger: "click", content:"TEST", interactive: true, onTrigger(instance, event) {
    // Generate makes
    instance.setContent(generate_popup_list("make", makes));
  }});
tippy('#help_model', {trigger: "click", content:"TEST", interactive: true, onTrigger(instance, event) {
    // Generate makes
    if (!($('.bar input[name="make"]')[0].value)) models = {};
    instance.setContent(generate_popup_list("model", Object.keys(models)));
  }});
tippy('#help_trim', {trigger: "click", content:"TEST", interactive: true, onTrigger(instance, event) {
    // Generate makes
    data = {}
    model = $('.bar input[name="model"]')[0].value.toLowerCase();
    if (model in models){
        for (i = 0; i < models[model].length; i++){
            if (models[model][i].trim) data[models[model][i].trim] = 0;
        }
        instance.setContent(generate_popup_list("trim", Object.keys(data)));
    }

  }});
tippy('#help_series', {trigger: "click", content:"TEST", interactive: true, onTrigger(instance, event) {
    // Generate makes
    data = {}
    model = $('.bar input[name="model"]')[0].value.toLowerCase();
    if (model in models){
        for (i = 0; i < models[model].length; i++){
            if (models[model][i].series) data[models[model][i].series] = 0;
        }
        instance.setContent(generate_popup_list("series", Object.keys(data)));
    }
  }});

update_field = function(name, e){ $('.bar input[name="' + name + '"]')[0].value = $(e).text().toLowerCase(); $('.bar input[name="' + name + '"]').trigger('change')};

generate_popup_list = function(name, content_array){

    // Remove null
    content_array_filtered = []
    for (i = 0; i < content_array.length; i++){
        if (content_array[i] && content_array[i] !== "null") content_array_filtered.push(content_array[i]);
    }
    content_array = content_array_filtered;
    content = "<div class='popup_list {0}_list'>";
    for (i = 0; i < content_array.length; i++){
        content += "<span onclick='update_field(\"{0}\", this)'>{" + String(i+1) + "}</br></span>";
    }
    content += "</div>";
    if (!content_array.length) return "No available {0}".format(name)
    else return content.format(name, ...content_array);
}

$('.bar input[name="make"]').on("change", function(e){

    // Load models
    if (this.value) {
        params = {make: this.value}
        models = {}
        jQuery.get( "api/get_models", params, function(e){
            
            for(i = 0; i < e.length; i++){
                item = e[i]
                if (!(item.model in models)){
                    models[item.model] = []
                }
                if (item.trim || item.series) models[item.model].push({trim: item.trim, series: item.series})
            }
            
        });
    }
});

var mymap = L.map('map', {zoomControl:false}).setView([40, -95], 4);
L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/light-v10',
	accessToken: 'pk.eyJ1IjoibWF6ejQxIiwiYSI6ImNrNWd4Ym4yeDBianQzbG1pczUyajZ0dTcifQ.dBBtcCIrojmrU6-Qj-y2qw'
}).addTo(mymap);
L.control.scale().addTo(mymap);

var heat = undefined

String.prototype.format = function() {
  a = (' ' + this).slice(1);
  for (k in arguments) {
    a = a.replace(new RegExp("\\{" + k + "\\}", "g"), arguments[k])
  }
  return a
}

var map_data = {}
var popup_data = {}

var curve_generator = function(data, range, id, title){

     // Empty out the previous curve
        $(id).empty();

        var margin = {top: 0, right: 2, bottom: 20, left: 2};
        width = Math.floor($(id).width()) - margin.left - margin.right,
            height = Math.floor($(id).height()) - margin.top - margin.bottom;

        // append the svg object to the body of the page
        var svg = d3.select(id)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
          .append("g")
            .attr("transform",
                                      "translate(" + margin.left + "," + margin.top + ")");

        // add the x Axis
          var x = d3.scaleLinear()
                    .domain(range)
                    .range([0, width]);
          svg.append("g")
              .attr("transform", "translate(0," + height + ")")
              .call(d3.axisBottom(x).ticks(4));

         // Compute kernel density estimation
          tks = x.ticks(25)
          kernelParam = (tks[1] - tks[0]) / 2
          var kde = kernelDensityEstimator(kernelEpanechnikov(kernelParam), tks)
          var density =  [[range[0],0]]
          density.push(...kde(data))
        


                // Get y range
                max_y = 0;
                for(i = 0; i < density.length; i++){
                                                if (max_y < density[i][1]) max_y = density[i][1];

                                            }

                density.push([range[1],0])

              // add the y Axis
              var y = d3.scaleLinear()
                        .range([height, 0])
                        .domain([0, max_y*1.1]);
      svg.append("g")
              .call(d3.axisLeft(y).tickValues([])
                            ).select('.domain')
                            .attr('stroke-width', 0);

          // Plot the area
          svg.append("path")
              .attr("class", "mypath")
              .datum(density)
              .attr("fill", "white")
              .attr("opacity", ".8")
              .attr("stroke", "none")
              .attr("stroke-width", 1)
              .attr("stroke-linejoin", "round")
              .attr("d",  d3.line()
                                        .curve(d3.curveBasis)
                                          .x(function(d) { return x(d[0]); })
                                          .y(function(d) { return y(d[1]); })
                                      );

    svg.append("text")
            .attr("x", (width / 2))             
            .attr("y", 20)
            .attr("text-anchor", "middle")  
            .style("font-size", "16px") 
            .text(title);

}



// Function to compute density
function kernelDensityEstimator(kernel, X) {
      return function(V) {
              return X.map(function(x) {
                        return [x, weighted_mean(V.map(function(v) { return kernel(x - v.val); }), V.map(function(v) { return v.cnt; }))];
                      });
            };
}
function kernelEpanechnikov(k) {
      return function(v) {
              return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
            };
}

var map_update =  function( data ) {
        if (!(data.listings.length)) {
            $("#cover").html("<div class='noresults'>No results found</div>");
            $("#cover").show();
            return;
        }
        $("#cover").hide();
        mymap.setView(new L.LatLng(data.geo.lat, data.geo.lon), data.zoom);
        map_data = data
        popup_data = {}
        console.log(map_data)
        heatv = []
        for (i = 0; i < data.listings.length; i++){
            e = data.listings[i]
            heatv.push([e.lat, e.lon, e.cnt / e.max_cnt])
            grid_coord = [Math.floor(e.lat * 1000000) / 1000000, Math.floor(e.lon * 1000000) / 1000000]
            popup_data[grid_coord] = e
        }
        
        if (heat !== undefined) mymap.removeLayer(heat);
        heat = L.heatLayer(heatv, {radius: 20, blur: 5, gradient: {0.2: 'blue', 0.55: 'lime', 1: 'red'}, max: 0.001}).addTo(mymap);

        mymap.on('click', function(e){
              var coord = e.latlng;
              var lat = parseFloat(coord.lat);
              var lng = parseFloat(coord.lng);
                
              // Get the data point closest to this
              var side = parseFloat(map_data.side);
              grid_coord = [Math.floor((lat + side / 2) / side) * side, Math.floor((lng + side/2) / side) * side];
              grid_coord = [Math.floor(grid_coord[0] * 1000000) / 1000000, Math.floor(grid_coord[1] * 1000000) / 1000000];

              info = popup_data[grid_coord];
              console.log(info);

              if (info !== undefined) {
              var popup = L.popup()
                .setLatLng(grid_coord)
                .setContent('<ul><li>Number of cars : {0}</li><li>Average price : ${1}</li><li>Average mileage : {2}</li></ul>'.format(info.cnt, Math.round(info.price), Math.round(info.mileage)))
                .openOn(mymap);}
              }); 
        
    total_count = 0
    for (i = 0; i < map_data.listings.length; i++){
        total_count += map_data.listings[i].cnt
    }

    $('#count_field').html("{0} Posts".format(total_count))
        
    load_graphs(...comp_vars);

}

$("#price_mileage_switch").click(function(e){

    e.stopPropagation();

    // Rotate
    $("#arrow_image").removeAttr("style");

    // Update graphs 
    if (Object.keys(map_data).length) load_graphs("price", "mileage");
    
    // update comp_vars
    comp_vars = ["price", "mileage"];
});

$("#year_price_switch").click(function(e){
    
    e.stopPropagation();

    // Rotate
    style = "transform: rotate(-120deg);left: -9px;top: 15px;";
    $("#arrow_image").removeAttr("style");
    $("#arrow_image").attr("style", style);

    // Update graphs 
    if (Object.keys(map_data).length) load_graphs("price", "year");

    // update comp_vars
    comp_vars = ["price", "year"];
});

$("#year_mileage_switch").click(function(e){

    e.stopPropagation();

    // Rotate
    style = "transform: rotate(120deg);left: 9px;top: 15px;";
    $("#arrow_image").removeAttr("style");
    $("#arrow_image").attr("style", style);

    // Update graphs 
    if (Object.keys(map_data).length) load_graphs("year", "mileage");

    // update comp_vars
    comp_vars = ["year", "mileage"];
});

function load_graphs(var1, var2){

    if (!(map_data.listings.length)) return;
    max_values = {"year": Math.ceil(Math.max(...map_data.listings.map(function(e){return e.year;}))), "price": map_data.listings[0].max_price, "mileage": map_data.listings[0].max_mileage};
    min_values = {"year": map_data.listings[0].min_year, "price": 0, "mileage": 0};
    titles= {"year": "Year", "price": "Price", "mileage": "Mileage"}

    plot_two_variables(map_data.listings, var1, var2, [min_values[var1], max_values[var1]], [min_values[var2], max_values[var2]], titles[var1], titles[var2], "cnt");
}

function plot_two_variables(data, var1, var2, max_var1, max_var2, name_var1, name_var2, weightvar){

    if (!data.length) return
    x_dict = []
    y_dict = []
    combined = []
    for (i = 0; i < data.length; i++){
        e = data[i]
        x_dict.push({val: e[var1], cnt: e[weightvar]})
        y_dict.push({val: e[var2], cnt: e[weightvar]})
        combined.push({x: e[var1], y: e[var2], cnt: e[weightvar]})
    }

    curve_generator(x_dict, max_var1, '#price_plot', "{0} density".format(name_var1));
    curve_generator(y_dict, max_var2, '#mileage_plot', "{0} density".format(name_var2));
    chart_2density(combined, "#combined_plot", max_var1, max_var2, "Combined density", name_var2, name_var1);
}


$("#search").click(function(e) {

	query = {}
	$(".search_bars input[type=text]").each(function() {
		if (this.value.length) query[this.name] = this.value
    });    

    close_details();
	latest_query = query;
	reset_navigation();
    update_price_analytics(query);

	jQuery.get( "api/get_listings", query, update_listings);
	jQuery.get( "api/get_map", query, map_update);
});

$("#count_map").click(function(e){

	heatv = []
	for (i = 0; i < map_data.listings.length; i++){
		e = map_data.listings[i]
		heatv.push([e.lat, e.lon, e.cnt / e.max_cnt])
	}
	
	mymap.removeLayer(heat);
	heat = L.heatLayer(heatv, {radius: 20, blur: 5, gradient: {0.2: 'blue', 0.55: 'lime', 1: 'red'}, max: 0.001}).addTo(mymap);

});

$("#price_map").click(function(e){

	heatv = []
	for (i = 0; i < map_data.listings.length; i++){
		e = map_data.listings[i]
        if (e.price > 0) heatv.push([e.lat, e.lon, Math.max(0, (e.max_price - e.price) / (e.max_price - e.min_price))**5])
	}
	
	mymap.removeLayer(heat);
	heat = L.heatLayer(heatv, {radius: 20, blur: 5, gradient: {0.2: 'red', 0.55: 'orange', 1: 'lime'}, max: 0.001}).addTo(mymap);

});

$("#mileage_map").click(function(e){

	heatv = []
	for (i = 0; i < map_data.listings.length; i++){
		e = map_data.listings[i]
        if (e.mileage > 0) heatv.push([e.lat, e.lon, Math.max(0, (e.max_mileage - e.mileage) / (e.max_mileage - e.min_mileage))**5])
	}
	
	mymap.removeLayer(heat);
	heat = L.heatLayer(heatv, {radius: 20, blur: 5, gradient: {0.2: 'red', 0.55: 'orange', 1: 'lime'}, max: 0.001}).addTo(mymap);
});

refresh_map = function(e){

    // Refresh map from server 

    query = {}
	$(".search_bars input[type=text]").each(function() {
		if (this.value.length) query[this.name] = this.value
    });    
    query["geo_coord"] = "{0};{1}".format(mymap.getCenter().lat, mymap.getCenter().lng);
    query["zoom"] = mymap.getZoom();

    close_details();
	latest_query = query;
	reset_navigation();
    update_price_analytics(query);

	jQuery.get( "api/get_map", query, map_update);
	jQuery.get( "api/get_listings", query, update_listings);
}

function update_navbar(){
    // Update the navigation bar
    if (current_page == 0) $("#navbar").hide();
    else {
        $("#page_number").html("{0}/{1}".format(current_page, Math.ceil(listing_total_count / page_size)));
        if (current_page == 1) $("#previous_page").removeAttr("onclick");
        else $("#previous_page").attr("onclick", "navigate_results(-1);");
        if (current_page == Math.ceil(listing_total_count / page_size)) $("#next_page").removeAttr("onclick");
        else $("#next_page").attr("onclick", "navigate_results(1);");
        $("#navbar").show();
    }
}

function reset_navigation(){
    current_page = 0;
    listing_total_count = 0;
    $("#navbar").hide();
}

function navigate_results(direction){
	current_page += direction;
	query = latest_query;
	query["window"] = page_size * (current_page - 1);
    jQuery.get( "api/get_listings", query, update_listings); 
    $([document.documentElement, document.body]).animate({
        scrollTop: $("#postings_title").offset().top
    }, 1000);
}


get_price = function(){
    mileage = $("#price_analytics input[name='mileage']").val();
    year = $("#price_analytics input[name='year']").val();
    make = latest_query["make"];
    model = latest_query["model"];
    if (model) { query = {make: make, model: model, year: year, mileage: mileage} }
    else {query = {make: make, year: year, mileage: mileage}}
    jQuery.get("api/get_price", query, update_guessed_price);
}

update_guessed_price = function(data){
    value = data[0]
    $('.computed_price').html("$ {0}".format(value));
}

update_price_analytics = function(query){
    let make = query["make"];
    let model = query["model"];
    
    $("#price_analytics").empty();
    if(!(make && make.length)){return;}
    
    $("#price_analytics").append(`<div class="col-md-12" id="postings_title">Analytics</div>`);
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
    $("#price_analytics").append(fields);

}

update_listings = function(data){

        if (!data.length){$("#postings").empty(); reset_navigation(); return;}
        else {
            listing_total_count = parseInt(data[0]["total_count"]);
			if (current_page == 0) current_page = 1;
            item = `<div class='col-md-3'><div class='post'>
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
            
            var price_tool = `<span class='price_tool'>
                <span class="price_tool_title">Make: {0}</span>
                <span class="price_tool_title">Model: {1}</span>
                <span class="price_tool_inputs">
                    <input type="text" name="mileage" placeholder="mileage"/>
                    <input type="text" name="year" placeholder="year"/>
                    <button type="button" id="get_price" class="btn btn-dark no-ring" onclick="get_price();">Refresh</button>
                </span>
                <span class="price_tool_result"></span>
            </span>`.format(latest_query["make"], latest_query["model"]);

            $("#postings").empty()
            $("#postings").append(`<div class="col-md-12" id="postings_title">Search Results</div>`);
            data.forEach(function(e){
                            make = e["make"]
                            model = (e["model_clean"] == null ? (e["model"] == null ? "unknown" : e["model"]) : e["model_clean"]).substr(0,25).replace(/ +$/,"")
                            trim = (e["trim_clean"] == null ? (e["trim"] == null ? "unknown" : e["trim"]) : e["trim_clean"]).substr(0,25).replace(/ +$/,"")
                            series = (e["series_clean"] == null ? (e["series"] == null ? "unknown" : e["series"]) : e["series_clean"]).substr(0,25).replace(/ +$/,"")
                            year = (e["year"] == null ? "unknown" : e["year"])
                            mileage = (e["mileage"] == null ? "unknown" : e["mileage"])
                            price = (e["price"] == null ? "unknown" : "$" + e["price"])
                            condition = (e["condition"] == null ? "unknown" : e["condition"])
                            url = e["url"]
                            title = e["title"]
                            puid = e["puid"]
                            $("#postings").append(item.format(make, model, year, mileage, price, url, title.substr(0,33).replace(/ +$/,""), trim, series, condition, puid))
                        });

            update_navbar();
            $("#content").show();


        }

}

close_details = function(){
    if ($("#details").length) $("#details").remove();
}

post_details = function(post){

    puid = $(post).attr('id')
    detail_item = ` <div class='col-md-12' id="details">   
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

    
    info_item = `<div class='{0}'><span class="headers">{0}</span><span class="value">{1}</span></div>`;
    history_item = `<div class='series'><span class="headers">{0}</span><span class="value"><a href='{2}'>{1}</a></span></div>`;

    jQuery.get( "api/get_details", {puid: puid}, function(data){

        evolution = []
        detailed_info = {}
        for (i = 0; i < data.length; i++){
            e = data[i]
            evolution.push({post_date: e.post_date_h, price: e.price, url: e.url})
            keys = Object.keys(e)
            for (j = 0; j < keys.length; j++){
                key = keys[j];
                if (e[key] != null) detailed_info[key] = e[key];
            }
        }
        
        info_lines = '';
        info_keys = Object.keys(detailed_info);
        console.log(detailed_info)
        for (i = 0; i < info_keys.length; i++){
            k = info_keys[i];
            v = detailed_info[k];
            
            // Treat individual cases
            if (v.length == 0) continue
            if (["model", "trim", "series" ,"geo", "puid", "url", "update", "title", "post_date", "post_date_h", "expired"].indexOf(k) != -1) continue
            else if (k == "model_clean") k = "model"
            else if (k == "top_speed") v = String(v) + " MPH"
            else if (k == "trim_clean") k = "trim"
            else if (k == "series_clean") k = "series"
            else if (k == "price" || k == "base_price") v = "$" + String(v)
            else if (k == "displacement") v = String(v) + " L"
            else if (k == "engine_power" || k == "brake_hp") v = String(v) + " HP"
            else if (["wheel_base_length", "front_wheel_size", "rear_wheel_size"].indexOf(k) != -1) v = String(v) + "\""

            info_lines += info_item.format(k,v)
        }
        console.log(info_lines)

        history_str = '';
        for (i = 0; i < evolution.length; i++){
            hist = evolution[i];
            history_str += history_item.format(hist.post_date, (hist.price == null ? "unknown" : "$"+hist.price), hist.url);
        }

        if ($("#details").length) $("#details").remove();

        $(post).parents(".col-md-3").after(detail_item.format(detailed_info["title"], info_lines, history_str));
    });
}

function chart_2density(data, id, range1, range2, title, axis1, axis2){

        // Empty out the previous curve
        $(id).empty();

       // set the dimensions and margins of the graph
            var margin = {top: 10, right: 2, bottom: 20, left: 2};
            width = Math.floor($(id).width()) - margin.left - margin.right,
                    height = Math.floor($(id).height()) - margin.top - margin.bottom;

    // append the svg object to the body of the page
    var svg = d3.select(id)
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
        .attr("transform",
                      "translate(" + margin.left + "," + margin.top + ")");

      // Add X axis
      var x = d3.scaleLinear()
        .domain(range1)
        .range([ margin.left, width - margin.right ]);
      svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisTop(x).ticks(4));

      // Add Y axis
      var y = d3.scaleLinear()
        .domain(range2)
        .range([ height - margin.bottom, margin.top ]);
      svg.append("g")
        .call(d3.axisRight(y).ticks(4));


      // compute the density data
      var densityData = d3.contourDensity()
        .x(function(d) { return x(d.x); })
        .y(function(d) { return y(d.y); })
        .size([width, height])
        .bandwidth(10)
        .weight(function(d) { return d.cnt; })
        (data)

      max_value = Math.max(...densityData.map(function(e){return e.value}));

      // Prepare a color palette
      var color = d3.scaleLinear()
          .domain([0, max_value]) // Points per square pixel.
          .range(["#cad2d3", "black"])

      // show the shape!
      svg.insert("g", "g")
        .selectAll("path")
        .data(densityData)
        .enter().append("path")
          .attr("d", d3.geoPath())
          .attr("fill", function(d) { return color(d.value); }) 

        svg.append("text")
                .attr("x", (width / 2))
                .attr("y", 20)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .text(title);


 svg.append("text")
              .attr("y", height - 30)
              .attr("x",30)
              .style("text-anchor", "middle")
              .style("font-size", "12px")
              .text(axis1);

                     svg.append("text")
              .attr("y", height + 15)
              .attr("x",width/2)
              .style("text-anchor", "middle")
              .style("font-size", "12px")
              .text(axis2);
}

function weighted_mean(values, weights){

    total_weight = 0
    total_values = 0
    for (i = 0; i < values.length; i++){
        total_values += values[i]
        total_weight += weights[i]
    }

    if (total_weight) return total_values / total_weight;
    return 0;

}


