(function(){$("#navbar").hide();})();

function update_navbar(){
    // Update the navigation bar
    if (current_page === 0) $("#navbar").hide();
    else {
        $("#page_number").html("{0}/{1}".format(current_page, Math.ceil(listing_total_count / page_size)));
        if (current_page === 1) $("#previous_page").removeAttr("onclick");
        else $("#previous_page").attr("onclick", "navigate_results(-1);");

        if (current_page === Math.ceil(listing_total_count / page_size)) $("#next_page").removeAttr("onclick");
        else $("#next_page").attr("onclick", "navigate_results(1);");
        $("#navbar").show();
    }
}

function reset_navigation(){
    current_page = 0;
    listing_total_count = 0;
    $("#navbar").hide();
}

