(function() {

    // Define actions once everything is loaded

    $("#search").click(function(e) {
        load_results(refresh_results());
    });
})();

function refresh_results(e){

    let query = {};
    $(".search_bars input[type=text]").each(function() {
        if (this.value.length) query[this.name] = this.value;
    });
    latest_query = query;
    return query;
}

function load_results(query){

    close_details();
    reset_navigation();
    update_price_analytics(query);

    // Show map wheel
    const cover = $("#cover");
    const wheel = $("#wheel");
    const no_results = $("#no_results");
    no_results.hide();
    cover.show();
    wheel.show();

    jQuery.get( "api/get_map", query, map_update);
    jQuery.get( "api/get_listings", query, update_listings);
}

function refresh_map(e){

    query = refresh_results();
    query["geo_coord"] = "{0};{1}".format(mymap.getCenter().lat, mymap.getCenter().lng);
    query["zoom"] = mymap.getZoom();
    latest_query = query;
    console.log(query);

    load_results(query);
}

function navigate_results(direction){
	current_page += direction;
	let query = latest_query;
	query["window"] = page_size * (current_page - 1);
    jQuery.get( "api/get_listings", query, update_listings);
    $([document.documentElement, document.body]).animate({
        scrollTop: $("#postings_title").offset().top
    }, 1000);
}
