import math
import numpy as np
import json
import random
import plotly.graph_objs as go


class SupportFunctions:
    source_data = {}
    features = []
    ips = []

    myGlobal = "hello"

    def __init__(self, name):
        try:
            with open(name) as data_file:
                self.source_data = json.load(data_file)
        except IOError:
            print('Result not found')
        self.features = self.generate_list_of_features()
        self.ips = self.source_data.keys()
    def changeGlobal(self):
        self.myGlobal = "bye"
    def normalize(self,h):
        return h / np.sum(h)
    def bhattacharyya(self,h1, h2):
      '''Calculates the Byattacharyya distance of two histograms.'''
      return 1 - np.sum(np.sqrt(np.multiply(self.normalize(h1), self.normalize(h2))))
    def chisquare(self,h1,h2):
        nh1 = self.normalize(h1)
        nh2 = self.normalize(h2)
        suma = 0
        for i in range(0,len(nh1)):
            if not(nh1[i] == 0 and nh2[i] == 0):
                suma= np.add(suma,np.power(np.subtract(nh1[i],nh2[i]),2)/(np.add(nh1[i],nh2[i])))
        return suma
    def intersetciton(self,h1,h2):
        nh1 = self.normalize(h1)
        nh2 = self.normalize(h2)
        suma = 0
        for i in range(0,len(nh1)):
            suma = np.add(suma,min(nh1[i],nh2[i]))
        return suma
    def prepare_lists_to_compare(self,dictA,dictB):
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

    def reformat_hour(self,hour):
        return "{0:0>2}".format(hour)

    def get_distance_bhat(self,ip1, ip2, date1, date2, hour1, hour2, feature):
        if hour1 not in self.source_data[ip1]['time'][date1] and hour2 not in self.source_data[ip2]['time'][date2]:
            result = -1
        elif hour1 not in self.source_data[ip1]['time'][date1] or hour2 not in self.source_data[ip2]['time'][date2]:
            result = -1
        else:
            classA = self.source_data[ip1]['time'][date1][hour1][feature]
            classB = self.source_data[ip2]['time'][date2][hour2][feature]
            # TODO think about one profile have feature and the second does not
            if not classA and not classB:
                result = -1
            elif not classA or not classB:
                result = -1
            else:
                [firsthist, secondhist] = self.prepare_lists_to_compare(classA, classB)
                result = np.asscalar(self.bhattacharyya(firsthist, secondhist))
        return result
    def get_distance_same_hours(self,ip1, ip2, date1, date2, feature):
        result = {}
        result['bhattacharyya'] = {}
        result['chisquare'] = {}
        result['intersection'] = {}
        index = ""
        for i in range(0, 24):
            hour = "{0:0>2}".format(i)
            index = ip1 + '--' + ip2 + '--' + date1 + '--' + date2
            classA = self.source_data[ip1]['time'][date1][hour][feature]
            classB = self.source_data[ip2]['time'][date2][hour][feature]
            if not classA or not classB:
                result['bhattacharyya'] = -1
                result['chisquare'] = -1
                result['intersection'] = -1

            [firsthist, secondhist] = self.prepare_lists_to_compare(classA, classB)
            bhat = np.asscalar(self.bhattacharyya(firsthist, secondhist))
            chi = np.asarray(self.chisquare(firsthist, secondhist))
            inter = np.asarray(self.intersetciton(firsthist, secondhist))
            result['bhattacharyya'][index] = bhat
            result['chisquare'][index] = chi
            result['intersection'][index] = inter
        return result
    def get_distances_same_ip(self,ip,date,feature):
        result = {}
        result['bhattacharyya'] = {}
        result['chisquare'] = {}
        result['intersection'] = {}

        for i in range(0,23):
            hourA = "{0:0>2}".format(i)
            hourB = "{0:0>2}".format(i+1)
            if hourA not in self.source_data[ip]['time'][date] or hourB not in self.source_data[ip]['time'][date]:
                continue
            classA = self.source_data[ip]['time'][date][hourA][feature]
            classB = self.source_data[ip]['time'][date][hourB][feature]
            if not classA or not classB:
                result['bhattacharyya'][hourA + '--' + hourB] = -1
                result['chisquare'][hourA + '--' + hourB] = -1
                result['intersection'][hourA + '--' + hourB] = -1
                continue
            [firsthist,secondhist] = self.prepare_lists_to_compare(classA,classB)

            bhat = np.asscalar(self.bhattacharyya(firsthist, secondhist))
            chi = np.asarray(self.chisquare(firsthist, secondhist))
            inter = np.asarray(self.fintersetciton(firsthist, secondhist))

            result['bhattacharyya'][hourA + '--' + hourB] = bhat
            result['chisquare'][hourA + '--' + hourB] = chi
            result['intersection'][hourA + '--' + hourB] = inter
        return result

    def generate_list_of_features(self):
        #result = ['clientDictClassBnetworksEstablished','clientDictClassBnetworksNotEstablished','serverDictClassBnetworksEstablished','serverDictClassBnetworksNotEstablished']
        result = ['clientDictClassBnetworksEstablished','clientDictClassBnetworksNotEstablished']
        result = result +['clientDictOfConnectionsEstablished','clientDictOfConnectionsNotEstablished']
        s = ['client','server']
        #s = ['client']
        d = ['SourcePort', 'DestinationPort']
        #d = ['DestinationPort']
        f = ['TotalBytes', 'TotalPackets', 'NumberOfFlows']
        p = ['TCP','UDP']
        e = ['Established','NotEstablished']
        #e = ['Established']
        for source in s:
            for port in d:
                for feature in f:
                    for protocol in p:
                        if source == 'server':
                            result.append(source+port+feature+protocol+'Established')
                        else:
                            result.append(source+port+feature+protocol+'Established')
                            result.append(source+port+feature+protocol+'NotEstablished')

        return result

    def create_traces__dict(self,data):
        result = {}
        for key in data:
            result[key] = go.Scatter(
                x=sorted(data[key]),
                y=[data[key][x] for x in sorted(data[key])],
                name=key,
                mode='markers+lines',
                hoverlabel={'namelength': -1}

            )
        return result
    labeldict = {'bhattacharyya':'min is 0,max is 1.0, match is 0, half match is 0.5',
                 'chisquare': 'min is 0,max is 2.0, match is 0, half match is 0.67',
                 'intersection': 'min is 0,max is 1.0, match is 1, half match is 0.5'
                }