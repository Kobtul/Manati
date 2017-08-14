import json
import matplotlib.pyplot as plt

import plotly.offline as py
import plotly.graph_objs as go
import math
import numpy as np


def normalize(h):
    return h / np.sum(h)

def bhattacharyya(h1, h2):
  '''Calculates the Byattacharyya distance of two histograms.'''
  return 1 - np.sum(np.sqrt(np.multiply(normalize(h1), normalize(h2))))
def chisquare(h1,h2):
    nh1 = normalize(h1)
    nh2 = normalize(h2)
    suma = 0
    for i in range(0,len(nh1)):
        if not(nh1[i] == 0 and nh2[i] == 0):
            suma= np.add(suma,np.power(np.subtract(nh1[i],nh2[i]),2)/(np.add(nh1[i],nh2[i])))
    return suma
def intersetciton(h1,h2):
    nh1 = normalize(h1)
    nh2 = normalize(h2)
    suma = 0
    for i in range(0,len(nh1)):
        suma = np.add(suma,min(nh1[i],nh2[i]))
    return suma
if __name__ == "__main__":
    result = {}
    try:
        with open ('result.json') as data_file:
            result = json.load (data_file)
    except IOError:
        print('country cache not found')

    classA = result['147.32.83.252']['time']['2016/10/05']['08']['clientDictClassBnetworks']
    classB = result['147.32.87.252']['time']['2016/10/05']['08']['clientDictClassBnetworks']
    #for hour in result['147.32.86.78']['time']['2016/10/05']:
    #TODO fix bug than the ordering is different
    #Check why is  there chisquere NAN
    #    classA = result['147.32.86.78']['time']['2016/10/05']['12']['clientDictClassBnetworks']
    #    classB = result['147.32.83.252']['time']['2016/10/05']['12']['clientDictClassBnetworks']
    #TODO Why for '147.32.83.252' in manati are day profile hours strange
    #TODO nummber typo
    # L = [classA,classB]
    # max_key = max(max(d) for d in L)
    # empty = dict.fromkeys(set().union(*L), 0)
    # L1 = [dict(empty, **d) for d in L]
    mergedKeys = set(classA.keys()) | set(classB.keys()) # pipe is union

    firsthist = []
    secondhist = []
    for key in mergedKeys:
        if key in classA:
            firsthist.append(float(classA[key]))
        else:
            firsthist.append(0)
        if key in classB:
            secondhist.append(float(classB[key]))
        else:
            secondhist.append(0)

    bhat = np.asscalar(bhattacharyya(firsthist,secondhist))
    chi = np.asarray(chisquare(firsthist,secondhist))
    inter = np.asarray(intersetciton(firsthist,secondhist))

    print "bhattacharyya: " + str(bhat) + " Exact match is 0, Mismatch is 1"
    print "chisquare: " + str(chi) + " Exact match is 0,Mismatch is 2"
    print "intersection: " + str(inter)+ " Exact match is 1,Mismatch is 0"

    fig = {
        "data": [
            {
                "values": classA.values(),
                "labels": classA.keys(),
                "domain": {"x": [0, .48]},
                #"name": "GHG Emissions",
                "hoverinfo": "label+percent",
                "hole": .4,
                "type": "pie"
            },
            {
                "values": classB.values(),
                "labels": classB.keys(),
                "text": "CO2",
                "textposition": "inside",
                "domain": {"x": [.52, 1]},
                #"name": "CO2 Emissions",
                "hoverinfo": "label+percent",
                "hole": .4,
                "type": "pie"
            }],
        "layout": {
            "title": "Comparison between class B networks",
            "annotations": [
                {
                    "font": {
                        "size": 20
                    },
                    "showarrow": False,
                    "text": "First",
                    "x": 0.20,
                    "y": 0.5
                },
                {
                    "font": {
                        "size": 20
                    },
                    "showarrow": False,
                    "text": "Second",
                    "x": 0.8,
                    "y": 0.5
                },
                {
                    "font": {
                        "size": 20
                    },
                    "showarrow": False,
                    "text": "bhattacharyya: " + str(bhat) + " chisquare: " + str(chi) + " intersection: " + str(inter),
                    "x": 0.0,
                    "y": 0.0
                }
            ]
        }
    }
    py.plot(fig, filename='donut')


