"""Auxiliary functions"""
import re

def vin_check(vin):
    """ Verify the checksum """
    translit = \
            {'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,\
             'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5,         'P': 7, 'R': 9,\
                     'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,\
                     '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '0': 0}
    weights = [8,7,6,5,4,3,2,10,0,9,8,7,6,5,4,3,2]
    try:
        total = sum(translit[vin[i]]*weights[i] for i in range(17))
        check_num = total % 11
        if 0 <= check_num <= 9:
            check = str(check_num)
        else:
            check = 'X'
        if check == vin[8]:
            return True
        else:
            return False
    except Exception:
        return False


