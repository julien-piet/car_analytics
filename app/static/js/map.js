let heat = undefined;
let map_data = {};
let popup_data = {};
let mymap;

(function (){

    // Initialize
    mymap = L.map('map', {zoomControl:false}).setView([40, -95], 4);
    L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox/light-v10',
        accessToken: 'pk.eyJ1IjoibWF6ejQxIiwiYSI6ImNrNWd4Ym4yeDBianQzbG1pczUyajZ0dTcifQ.dBBtcCIrojmrU6-Qj-y2qw'
    }).addTo(mymap);
    L.control.scale().addTo(mymap);

    // Add switches to different heat maps
    $("#count_map").click(function(e){

        let heatv = [];
        for (let i = 0; i < map_data.listings.length; i++){
            let e = map_data.listings[i];
            heatv.push([e.lat, e.lon, e.cnt / e.max_cnt]);
        }

        mymap.removeLayer(heat);
        heat = L.heatLayer(heatv, {radius: 20, blur: 5, gradient: {0.2: 'blue', 0.55: 'lime', 1: 'red'}, max: 0.001}).addTo(mymap);

    });

    $("#price_map").click(function(e){

        let heatv = [];
        for (let i = 0; i < map_data.listings.length; i++){
            let e = map_data.listings[i];
            if (e.price > 0) heatv.push([e.lat, e.lon, Math.max(0, (e.max_price - e.price) / (e.max_price - e.min_price))**5]);
        }

        mymap.removeLayer(heat);
        heat = L.heatLayer(heatv, {radius: 20, blur: 5, gradient: {0.2: 'red', 0.55: 'orange', 1: 'lime'}, max: 0.001}).addTo(mymap);

    });

    $("#mileage_map").click(function(e){

        let heatv = [];
        for (let i = 0; i < map_data.listings.length; i++){
            let e = map_data.listings[i];
            if (e.mileage > 0) heatv.push([e.lat, e.lon, Math.max(0, (e.max_mileage - e.mileage) / (e.max_mileage - e.min_mileage))**5]);
        }

        mymap.removeLayer(heat);
        heat = L.heatLayer(heatv, {radius: 20, blur: 5, gradient: {0.2: 'red', 0.55: 'orange', 1: 'lime'}, max: 0.001}).addTo(mymap);
    });


})();

// Global functions

function map_update( data ) {

    // Remove map cover

    const cover = $("#cover");
    if (!(data.listings.length)) {
        cover.html("<div class='noresults'>No results found</div>");
        cover.show();
        return;
    }
    cover.hide();

    // Change view

    mymap.setView(new L.LatLng(data.geo.lat, data.geo.lon), data.zoom);
    map_data = data;
    popup_data = {};

    // Get heat
    let heatv = [];
    for (let i = 0; i < data.listings.length; i++){
        let e = data.listings[i];
        heatv.push([e.lat, e.lon, e.cnt / e.max_cnt]);
        let grid_coord = [Math.floor(e.lat * 1000000) / 1000000, Math.floor(e.lon * 1000000) / 1000000];
        popup_data[grid_coord] = e;
    }

    // Refresh heatmap

    if (heat !== undefined) mymap.removeLayer(heat);
    heat = L.heatLayer(heatv, {radius: 20, blur: 5, gradient: {0.2: 'blue', 0.55: 'lime', 1: 'red'}, max: 0.001}).addTo(mymap);

    // Setup popups

    mymap.on('click', function(e){
        let coord = e.latlng;
        let lat = parseFloat(coord.lat);
        let lng = parseFloat(coord.lng);

        // Get the data point closest to this
        let side = parseFloat(map_data.side);
        let grid_coord = [Math.floor((lat + side / 2) / side) * side, Math.floor((lng + side/2) / side) * side];
        grid_coord = [Math.floor(grid_coord[0] * 1000000) / 1000000, Math.floor(grid_coord[1] * 1000000) / 1000000];

        let info = popup_data[grid_coord];
        if (info !== undefined) {
            L.popup()
            .setLatLng(grid_coord)
            .setContent('<ul><li>Number of cars : {0}</li><li>Average price : ${1}</li><li>Average mileage : {2}</li></ul>'.format(info.cnt, Math.round(info.price), Math.round(info.mileage)))
            .openOn(mymap);
        }
    });

    // Get total count

    let total_count = 0;
    for (let i = 0; i < map_data.listings.length; i++){
        total_count += map_data.listings[i].cnt;
    }

    $('#count_field').html("{0} Posts".format(total_count));

    // Load graphs

    load_graphs(...comp_vars);

}