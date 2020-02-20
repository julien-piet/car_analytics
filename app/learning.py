""" Do all the learning stuff """
import numpy as np
import time

from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score

import math
from .database_connection import *
import dill as pickle


# Precompute models for popular selections
# Fix year, do regression on mileage (seems to be the best compromise for the moment)

# Other ideas are :
#       * Kernel Regression with Nadaraya–Watson kernel, on two parameters (year and mileage). Works great but very slow
#       * Nadaraya–Watson Kernel smoother (same are previously but the bandwith is fixed). Doesn't work well for all possibilities, but fast


class ModelError(Exception):
    """ Base error """
    pass


class ModelExpired(ModelError):
    """Returns this if the regression model is expired """
    pass


class ModelUnknown(ModelError):
    """Returns this if the regression model is unknown """
    pass


class NotEnoughData(ModelError):
    """ In case we don't have enough data """
    pass


def load_model(make, model, year, exp=1296000):
    """ Load model if possible from databse, if not expired """
    db = database_connection()
    data = db.query_smart("SELECT *, EXTRACT(EPOCH FROM time) as time FROM kr_models WHERE make=%s and model=%s and year=%s",[make, model, year])
    if not len(data):
        raise ModelUnknown()
    
    data = data[0]
    if data["time"] < time.time() - exp:
        raise ModelExpired()

    db.__del__()
    return pickle.loads(data["pkl"])


def gen_model(make, model, year):
    """ Generate the model """

    # Get data
    sql = """WITH temp AS 
                (SELECT make, 
                        model_clean, 
                        trim_clean, 
                        series_clean, 
                        extract(year from year) as year,
                        price, 
                        mileage, 
                        model,
                        trim, 
                        series 
                FROM (
                    SELECT row_number() over (partition by puid order by post_date desc) as ln, * from (
                        SELECT * from ads where make=%(make)s {0} and year is not null and price is not null and mileage is not null)
                    as a ) 
                as b WHERE ln = 1)

            SELECT  price, 
                    mileage,
                    ABS(%(year)s - year)
            FROM (
                (SELECT price, mileage, year
                FROM temp
                WHERE year = %(year)s)
                UNION ALL
                (SELECT price, mileage, year
                FROM temp WHERE year != %(year)s ORDER BY ABS(%(year)s - year) LIMIT 100)
            ) as t
            CROSS JOIN 
                (SELECT percentile_disc(0.01) within group (order by mileage) as min_mileage,
                        percentile_disc(0.99) within group (order by mileage) as max_mileage,
                        percentile_disc(0.01) within group (order by price) as min_price,
                        percentile_disc(0.99) within group (order by price) as max_price FROM temp) as stats
            WHERE   mileage <= stats.max_mileage and mileage >= stats.min_mileage and price <= stats.max_price and price >= stats.min_price
                    and price >= 100;""".format("and model_clean=%(model)s" if model else "")
    
    db = database_connection()
    db.cur.execute(sql, {'make': make, 'model': model, 'year': year}) 
    data = [{'mileage': float(item[1]), 'price': float(item[0]), 'weight':np.exp(-float(item[2]))} for item in db.cur.fetchall()]

    # Train model
    x_var = ["mileage"]
    y_var = ["price"]

    X = [pt["mileage"] for pt in data]
    Y = [pt["price"] for pt in data]
    weight = [pt["weight"] for pt in data]

    # Either linear Y = aX + b, or exponential Y = a exp(b*X) <=> ln(Y) = ln(a) + b*X
    # Exponential is considered to be a better model, so it is priviledged with exp_pref score boost
    exp_pref = 1.2

    np_X = [[x] for x in X]
    np_Y = [[y] for y in Y]
    ln_Y = [[np.log(y)] for y in Y]
    
    models = []

    # Exponential regression
    reg = LinearRegression().fit(np_X, ln_Y, weight)
    out_func = lambda x: np.exp(x)
    score = exp_pref*r2_score(Y, out_func(reg.predict(np_X)), sample_weight=weight, multioutput='variance_weighted')
    models.append([reg,score,out_func, "exp"])

    # Linear regression
    reg = LinearRegression().fit(np_X, np_Y, weight)
    models.append([reg,reg.score(np_X, np_Y, weight),lambda x: x, "lin"])

    # Keep best model
    models = sorted(models, key=lambda item: -item[1])

    return models[0]


def est_model(make, model, year, queries=None, exp=1296000):
    """ Load / Generate model and return fit """
    
    # Load model
    kr_model = None
    try:
        kr_model = load_model(make, model, year, exp)
    except ModelError as e:
        kr_model = gen_model(make, model, year)
        if type(e).__name__ == 'ModelExpired':
            sql = "UPDATE kr_models SET time=current_timestamp, pkl=%s WHERE make=%s and model=%s and year=%s;"
            data = [pickle.dumps(kr_model), make, model, year]
        else:
            sql = "INSERT INTO kr_models (time, pkl, make, model, year) VALUES (current_timestamp, %s, %s, %s, %s);"
            data = [pickle.dumps(kr_model), make, model, year]
        db = database_connection()
        db.cur.execute(sql,data)
        db.__del__()

    # Return parameters
    if queries:
        return [max(0,math.floor(i[0])) for i in kr_model[2](kr_model[0].predict([[q] for q in queries]))]
    else:
        return kr_model


def est_model_gen(make, model):
    """ Build search function for all years """

    year = time.strftime("%Y")
    models = {}
    last_good_year = year
    for yr in range(year, year-100, -1):
        try:
            mod = est_model(make, model, yr)
            models[yr] = mod
            last_good_year = yr
        except:
            models[yr] = models[last_good_year]

    return models
