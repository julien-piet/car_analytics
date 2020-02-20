let comp_vars = ["price", "mileage"];

function curve_generator(data, range, id, title) {

    // Empty out the previous curve
    $(id).empty();

    // Compute margins
    let margin = {top: 0, right: 2, bottom: 20, left: 2};
    let width = Math.floor($(id).width()) - margin.left - margin.right;
    let height = Math.floor($(id).height()) - margin.top - margin.bottom;

    // Append the svg object to the body of the page
    let svg = d3.select(id)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Add the x Axis
    let x = d3.scaleLinear()
        .domain(range)
        .range([0, width]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(4));

    // Compute kernel density estimation
    let tks = x.ticks(25);
    let kernelParam = (tks[1] - tks[0]) / 2;
    let kde = kernelDensityEstimator(kernelEpanechnikov(kernelParam), tks);
    let density = [[range[0], 0]];
    density.push(...kde(data));

    // Get y range
    let max_y = 0;
    for (let i = 0; i < density.length; i++) {
        if (max_y < density[i][1]) max_y = density[i][1];

    }
    density.push([range[1], 0]);

    // Add the y Axis
    let y = d3.scaleLinear()
        .range([height, 0])
        .domain([0, max_y * 1.1]);
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
        .attr("d", d3.line()
            .curve(d3.curveBasis)
            .x(function (d) {
                return x(d[0]);
            })
            .y(function (d) {
                return y(d[1]);
            })
        );

    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(title);

}

function weighted_mean(values, weights) {
    let total_weight = 0;
    let total_values = 0;
    for (let i = 0; i < values.length; i++) {
        total_values += values[i];
        total_weight += weights[i];
    }

    if (total_weight) return total_values / total_weight;
    return 0;
}

// Function to compute density
function kernelDensityEstimator(kernel, X) {
    return function (V) {
        return X.map(function (x) {
            return [x, weighted_mean(V.map(function (v) {
                return kernel(x - v.val);
            }), V.map(function (v) {
                return v.cnt;
            }))];
        });
    };
}

function kernelEpanechnikov(k) {
    return function (v) {
        return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
}


function load_graphs(var1, var2) {

    if (!(map_data.listings.length)) return;
    let max_values = {
        "year": Math.ceil(Math.max(...map_data.listings.map(function (e) {
            return e.year;
        }))), "price": map_data.listings[0].max_price, "mileage": map_data.listings[0].max_mileage
    };
    let min_values = {"year": map_data.listings[0].min_year, "price": 0, "mileage": 0};
    let titles = {"year": "Year", "price": "Price", "mileage": "Mileage"};

    plot_two_variables(map_data.listings, var1, var2, [min_values[var1], max_values[var1]], [min_values[var2], max_values[var2]], titles[var1], titles[var2], "cnt");
}

function plot_two_variables(data, var1, var2, max_var1, max_var2, name_var1, name_var2, weightvar) {

    if (!data.length) return;
    let x_dict = [];
    let y_dict = [];
    let combined = [];
    for (let i = 0; i < data.length; i++) {
        let e = data[i];
        x_dict.push({val: e[var1], cnt: e[weightvar]});
        y_dict.push({val: e[var2], cnt: e[weightvar]});
        combined.push({x: e[var1], y: e[var2], cnt: e[weightvar]});
    }

    curve_generator(x_dict, max_var1, '#price_plot', "{0} density".format(name_var1));
    curve_generator(y_dict, max_var2, '#mileage_plot', "{0} density".format(name_var2));
    chart_2density(combined, "#combined_plot", max_var1, max_var2, "Combined density", name_var2, name_var1);
}


function chart_2density(data, id, range1, range2, title, axis1, axis2) {

    // Empty out the previous curve
    $(id).empty();

    // set the dimensions and margins of the graph
    let margin = {top: 10, right: 2, bottom: 20, left: 2};
    let width = Math.floor($(id).width()) - margin.left - margin.right;
    let height = Math.floor($(id).height()) - margin.top - margin.bottom;

    // append the svg object to the body of the page
    let svg = d3.select(id)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + margin.left + "," + margin.top + ")");

    // Add X axis
    let x = d3.scaleLinear()
        .domain(range1)
        .range([margin.left, width - margin.right]);
    svg.append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisTop(x).ticks(4));

    // Add Y axis
    let y = d3.scaleLinear()
        .domain(range2)
        .range([height - margin.bottom, margin.top]);
    svg.append("g")
        .call(d3.axisRight(y).ticks(4));


    // Compute the density data
    let densityData = d3.contourDensity()
        .x(function (d) {
            return x(d.x);
        })
        .y(function (d) {
            return y(d.y);
        })
        .size([width, height])
        .bandwidth(10)
        .weight(function (d) {
            return d.cnt;
        })
        (data);

    let max_value = Math.max(...densityData.map(function (e) {
        return e.value
    }));

    // Prepare a color palette
    let color = d3.scaleLinear()
        .domain([0, max_value]) // Points per square pixel.
        .range(["#cad2d3", "black"]);

    // show the shape!
    svg.insert("g", "g")
        .selectAll("path")
        .data(densityData)
        .enter().append("path")
        .attr("d", d3.geoPath())
        .attr("fill", function (d) {
            return color(d.value);
        });

    svg.append("text")
        .attr("x", (width / 2))
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text(title);


    svg.append("text")
        .attr("y", height - 30)
        .attr("x", 30)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text(axis1);

    svg.append("text")
        .attr("y", height + 15)
        .attr("x", width / 2)
        .style("text-anchor", "middle")
        .style("font-size", "12px")
        .text(axis2);
}


(function () {

    const arrow_image = $("#arrow_image");

    // Add parameter switchers;
    $("#price_mileage_switch").click(function (e) {

        e.stopPropagation();

        // Rotate
        arrow_image.removeAttr("style");

        // Update graphs
        if (Object.keys(map_data).length) load_graphs("price", "mileage");

        // update comp_vars
        comp_vars = ["price", "mileage"];
    });

    $("#year_price_switch").click(function (e) {

        e.stopPropagation();

        // Rotate
        let style = "transform: rotate(-120deg);left: -9px;top: 15px;";
        arrow_image.removeAttr("style");
        arrow_image.attr("style", style);

        // Update graphs
        if (Object.keys(map_data).length) load_graphs("price", "year");

        // update comp_vars
        comp_vars = ["price", "year"];
    });

    $("#year_mileage_switch").click(function (e) {

        e.stopPropagation();

        // Rotate
        let style = "transform: rotate(120deg);left: 9px;top: 15px;";
        arrow_image.removeAttr("style");
        arrow_image.attr("style", style);

        // Update graphs
        if (Object.keys(map_data).length) load_graphs("year", "mileage");

        // update comp_vars
        comp_vars = ["year", "mileage"];
    });

})();