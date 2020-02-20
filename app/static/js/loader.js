// Global variables

let latest_query = {};
let makes = [];
let listing_total_count = 0;
let current_page = 0;
const page_size = 52;

jQuery.get( "api/get_makes", function(e){makes = e;});

// Aux

String.prototype.format = function() {
  a = (' ' + this).slice(1);
  for (k in arguments) {
    a = a.replace(new RegExp("\\{" + k + "\\}", "g"), arguments[k])
  }
  return a
};

function loadScript(url, callback){
    let script = document.createElement("script")
    script.type = "text/javascript";
    script.onload = function(){
        callback();
    };
    script.src = url;
    document.getElementsByTagName("head")[0].appendChild(script);
}

// Load files

// Load search first
// Then graphs
// Then navbar
// then listings
// Then map
// Then analytics
// then actions


