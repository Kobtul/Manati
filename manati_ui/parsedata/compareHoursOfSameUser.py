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
def prepare_lists_to_compare(dictA,dictB):
    mergedKeys = set(dictA.keys()) | set(dictB.keys())  # pipe is union
    firsthist = []
    secondhist = []
    for key in mergedKeys:
        if key in dictA:
            firsthist.append(float(dictA[key]))
        else:
            firsthist.append(0)
        if key in dictB:
            secondhist.append(float(dictB[key]))
        else:
            secondhist.append(0)
    return [firsthist,secondhist]
if __name__ == "__main__":
    result = {}
    try:
        with open ('result.json') as data_file:
            result = json.load (data_file)
    except IOError:
        print('country cache not found')
    dictbhat={}
    dictchi={}
    dictinter = {}
    for i in range(0,22):
        hourA = "{0:0>2}".format(i)
        hourB = "{0:0>2}".format(i+1)
        classA = result['147.32.83.252']['time']['2016/10/05'][hourA]['clientDictClassBnetworks']
        classB = result['147.32.83.252']['time']['2016/10/05'][hourB]['clientDictClassBnetworks']
        if not classA or not classB:
            continue
        [firsthist,secondhist] = prepare_lists_to_compare(classA,classB)

        bhat = np.asscalar(bhattacharyya(firsthist, secondhist))
        chi = np.asarray(chisquare(firsthist, secondhist))
        inter = np.asarray(intersetciton(firsthist, secondhist))

        dictbhat[hourA + '--' + hourB] = bhat
        dictchi[hourA + '--' + hourB] = chi
        dictinter[hourA + '--' + hourB] = inter

    trace0 = go.Scatter(
        x=dictbhat.keys(),
        y=dictbhat.values(),
        name="bhattacharyya"
    )
    trace1 = go.Scatter(
        x=dictchi.keys(),
        y=dictchi.values(),
        name="chisquare",
    )
    trace2 = go.Scatter(
        x=dictinter.keys(),
        y=dictinter.values(),
        name="intersection"
    )
    data = [trace0,trace1,trace2]

    py.plot(data, filename='basic-line')