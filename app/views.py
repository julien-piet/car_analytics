# views.py

from flask import render_template
from flask import request
from app import app
from .database_connection import *
from .aux import vin_check
from flask import jsonify
import datetime
import re
from cgi import escape
import requests
import math
from .learning import *

# Constants
C = 40075016.686
pixel_height = 400
radius_ratio = 2.1


@app.route('/')
def index():
    return render_template("index.html")


@app.route('/api/get_price')
def test_ml():
    """ Price inference -- Can be slow if this hasn't been loaded yet """
    params = {key: escape(request.args.get(key)) for key in request.args}
    if 'model' in params:
        model = params["model"].lower()
    else:
        model = ""
    rslt = est_model(params["make"].lower(),model,float(params["year"]),queries=[float(params["mileage"])])
    return jsonify([i for i in rslt])


@app.route('/api/get_details')
def get_details():
    """ Get details about a post """

    # Get puid
    try:
        puid = request.args.get('puid')
    except Exception:
        return "Error", 400

    sql = """SELECT *, extract(YEAR from year) as year, to_char(post_date, 'dd/MM/yyyy') as post_date_h FROM ads_web WHERE puid = %s ORDER BY post_date;"""
    details = database_connection().query_smart(sql, [puid])
    
    # Get some fields form VIN decoder
    # 146 - Engine Manufacturer
    # 139 - Top Speed
    # 136 - Base Price
    # 134 - Turbo
    # 126 - EV
    # 71 - Brake HP
    # 119/120 - Wheel size
    # 111 - Wheel Base length
    # 24 - Fuel Type
    # 64 - Engine configuration
    # 63 - Trans speeds
    # 37 - Trans style
    # 33 - Number of seats
    # 21 - Engine power
    # 18 - Engine model
    # 13 - Displacement L
    # 9 - Number of cylinders
    vin_keys = {146: "Engine Manufacturer",
                139: "Top Speed",
                136: "Base Price",
                134: "Turbo",
                126: "Electrification",
                71:  "Brake HP",
                119: "Front wheel size",
                120: "Rear wheel size",
                111: "Wheel base length",
                24: "Fuel type",
                64: "Engine configuration",
                63: "Transmission speeds",
                37: "Transmission style",
                33: "Number of seats",
                21: "Engine power",
                18: "Engine model",
                13: "Displacement",
                9: "Number of cylinders"}
    
    vin = None
    year = None

    for d in details:
        if vin_check(d["vin"]):
            vin = d["vin"]
        if d["year"]:
            year = d["year"]

    if not vin: 
        return jsonify(details)
    
    
    add_info = requests.get("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinExtended/{0}?format=json&modelyear={1}".format(vin, year)).json()["Results"]
    extra = {vin_keys[int(item["VariableId"])].lower().replace(" ","_"): item["Value"] for item in add_info if int(item["VariableId"]) in vin_keys and item["Value"]}
    if "brake_hp" in extra:
        extra["brake_hp"] = math.floor(float(extra["brake_hp"]))
    if "engine_power" in extra:
        extra["engine_power"] = math.floor(float(extra["engine_power"]) / 0.745699872)
        if "brake_hp" in extra and abs(extra["brake_hp"] - extra["engine_power"]) < 2:
            del extra["brake_hp"]

    for d in details:
        d.update(extra)
    return jsonify(details)


@app.route('/api/get_makes', methods=['GET'])
def get_makes():
    
    db = database_connection()
    makes = [item[0] for item in db.query("SELECT DISTINCT make FROM models ORDER BY make;")]
    return jsonify(makes)



@app.route('/api/get_models', methods=["GET"])
def get_models():

    # Get make
    try:
        make = request.args.get('make').lower()
    except Exception:
        return "Error", 400


    # Get models
    db = database_connection()
    db.cur.execute("SELECT DISTINCT model_clean, trim_clean, series_clean FROM ads_web WHERE make=%s ORDER BY model_clean,trim_clean,series_clean;",[make])
    rslt = db.cur.fetchall()
    models = [{'model': item[0], 'trim': item[1], 'series': item[2]} for item in rslt]
    return jsonify(models)



def parse_params():
    """ Parse get parameters """

    params = {key: escape(request.args.get(key)) for key in request.args}

    # Parse arguments
    filters = []
    data = []
    if 'query' in params:
        filters.append("LOWER(title) like %s")
        data.append("%{}%".format(params["query"]))
    
    for key in ["make"]:
        if key in params:
            filters.append("{} like %s".format(key))
            data.append("%{}%".format(params[key].lower()))

    for key in ["model", "trim", "series"]:
        if key in params:
            filters.append("{}_clean like %s".format(key))
            data.append("%{}%".format(params[key].lower()))

    if "min_year" in params:
        year = "'" + str(datetime.datetime.strptime(params["min_year"] + "-01-02T00:00:00-0000", '%Y-%m-%dT%H:%M:%S%z')) + "'"
        filters.append("year >= {}".format(year))

    if "max_year" in params:
        year = "'" + str(datetime.datetime.strptime(params["max_year"] + "-01-02T00:00:00-0000", '%Y-%m-%dT%H:%M:%S%z')) + "'"
        filters.append("year <= {}".format(year))

    if "min_price" in params:
        filters.append("price >= %s")
        data.append(params["min_price"])

    if "max_price" in params:
        filters.append("price <= %s")
        data.append(params["max_price"])

    if "min_mileage" in params:
        filters.append("mileage >= %s")
        data.append(params["min_mileage"])

    if "max_mileage" in params:
        filters.append("mileage <= %s")
        data.append(params["max_mileage"])

    # Geo
    if "geo_coord" in params:
        lat, lon = [float(item) for item in params["geo_coord"].split(";")]
        try:
            radius = C * math.cos(math.pi * lat / 180) * pixel_height / (2**(8 + float(params["zoom"])))
        except:
            radius = C * math.cos(math.pi * lat / 180) * pixel_height / (2**(12))
        
        geo = {'sql_format': "'POINT({} {})'".format(lon, lat), 'lon': lon, 'lat': lat}
        filters.append("ST_DWithin(geo, {}, {})".format(geo["sql_format"], radius))
        return {'filters': filters, 'data': data, "geo": geo, "radius": radius, "zoom": float(params["zoom"])}


    if "geo" in params:
        try:
            radius = str(1000 * int(params["radius"]))
        except:
            radius = '20000'

        geo = get_geo(request.query_string)
        if geo:
            filters.append("ST_DWithin(geo, {}, {})".format(geo["sql_format"], radius))
            return {'filters': filters, 'data': data, "geo": geo, "radius": radius}

    return {'filters': filters, 'data': data}


@app.route("/api/get_map")
def get_map():


    parsed_params = parse_params()
    filters = parsed_params["filters"]
    data = parsed_params["data"]
    if "geo" in parsed_params:
        radius = float(parsed_params["radius"])
        geo = {"lat": parsed_params["geo"]["lat"], "lon": parsed_params["geo"]["lon"]}
        if "zoom" in parsed_params:
            zoom = parsed_params["zoom"]
        else:
            zoom = math.ceil(math.log(C * math.cos(math.pi * float(geo["lat"]) / 180) * pixel_height / (radius_ratio * radius),2) - 8)
        side = 360 * (radius / 25) / C
    else:
        geo = {"lat": "40", "lon": "-95"}
        zoom = 4
        side = 360 * 50000 / C

    filt = " and ".join(filters)
    if len(filt):
        filt = " and " + filt
    sql = """
    WITH temp AS 
    ( SELECT
    AVG(price) as price, AVG(mileage) as mileage, AVG(extract(YEAR from year)) as year, count(*) as cnt, x_round lon, y_round lat
    FROM (
    SELECT 
    year,
    (CASE WHEN 100 > coalesce(price, 0) THEN 100 ELSE coalesce(price, 0) END) as price, 
    (CASE WHEN 1000000 < coalesce(mileage, 0) THEN 1000000 ELSE coalesce(mileage, 0) END) as mileage, ST_X(geo::geometry) as x, ST_Y(geo::geometry) as y, round(ST_X(geo::geometry) / {0}) * {0} AS x_round, round(ST_Y(geo::geometry) / {0}) * {0} AS y_round
    FROM
    (
    SELECT row_number() over (partition by puid order by post_date desc) as ln, * from (
    SELECT * from ads_web where post_date > CURRENT_TIMESTAMP - INTERVAL '30 days' AND (expired is null or not expired) AND mileage is not null and price is not null) as a
    ) as b WHERE ln = 1 {1}) as c group by x_round, y_round)
    
    SELECT year, price, mileage, cnt, lon, lat, d.* FROM temp CROSS JOIN (
    SELECT
    percentile_disc(.95) within group (order by price) as max_price,
    percentile_disc(.05) within group (order by price) as min_price,
    percentile_disc(.95) within group (order by mileage) as max_mileage,
    percentile_disc(.05) within group (order by mileage) as min_mileage,
    percentile_disc(.05) within group (order by year) as min_year,
    max(cnt) as max_cnt FROM temp) as d;
    """.format(side,filt)

	    
    db = database_connection()
    results = db.cur.execute(sql, data)
    colnames = [desc[0] for desc in db.cur.description]
    listings = [{colnames[i]: float(str(line[i])) for i in range(len(colnames))} for line in db.cur.fetchall()]
    return jsonify({"listings": listings, "geo": geo, "zoom": zoom, "side": side})


@app.route("/api/get_listings")
def get_listings():

    params = {key: escape(request.args.get(key)) for key in request.args}
    parsed_params = parse_params()
    filters = parsed_params["filters"]
    data = parsed_params["data"]
    
    if "window" in params:
        limit = "LIMIT 52 OFFSET %s"
        data.append(params["window"])
    else:
        limit = "LIMIT 52"

    # Query database
    filt = " and ".join(filters)
    if len(filt):
        filt = " and " + filt
    sql = """WITH temp AS 
                (SELECT make, 
                        puid, 
                        condition, 
                        model_clean, 
                        trim_clean, 
                        series_clean, 
                        extract(YEAR from year) as year, 
                        price, 
                        mileage, 
                        ST_AsText(geo) as geo, 
                        model,
                        trim, 
                        series, 
                        post_date, 
                        vin, 
                        url, 
                        title 
                FROM (
                    SELECT row_number() over (partition by puid order by post_date desc) as ln, * from (
                        SELECT * from ads_web where post_date > CURRENT_TIMESTAMP - INTERVAL '30 days' AND (expired is null or not expired) {} ORDER BY post_date desc LIMIT 15000)
                    as a ) 
                as b  WHERE ln = 1 order by post_date desc LIMIT 7800)
                
                SELECT t.*, u.total_count FROM temp as t CROSS JOIN (SELECT count(*) as total_count FROM temp) as u {};""".format(filt,limit)

    db = database_connection()
    results = db.cur.execute(sql, data)
    colnames = [desc[0] for desc in db.cur.description]
    listings = [{colnames[i]: line[i] for i in range(len(colnames))} for line in db.cur.fetchall()]
    return jsonify(listings)


def get_geo(qstring):
    # Get coordinates

    get_location = re.compile("geo=(.*?)(?:$|&)")
    mtch = get_location.search(qstring.decode())
    try:
        loc = mtch.group(1)
        rslt = requests.get("https://nominatim.openstreetmap.org/search?format=json&q={}".format(loc)).json()[0]
        return {'sql_format': "'POINT({} {})'".format(rslt["lon"], rslt["lat"]), 'lon': rslt["lon"], 'lat': rslt["lat"]}
    except Exception:
        return None
