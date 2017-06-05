var _selectedIP;
var _selectedHour;
var _jsonprofie;
var _hoursarray;
/**
 * Created by david on 5.6.17.
 */

function DrawVisualization() {

    google.charts.load('current', {'packages':['geochart','corechart','table','bar']});
    google.charts.setOnLoadCallback(redrawVisualization());
    /*function regioMap() {
        $(window).on('drawmap', function (e) {
            console.log('Google charts loaded'/*, e.countriesDict*//*);
            //drawRegioMap()
            //Concurrent.Thread.create(drawRegioMap);
        });
    }*/
    function redrawVisualization() {
        //if(_selectedIP) {
        if (typeof _selectedIP !== 'undefined') {
            drawRegioMap();
            $('#histograms_div').empty();
            /*drawHistogram('clientSourcePortNumberOfFlowsTCP');
             drawHistogram('clientSourcePortNumberOfFlowsUDP');

             drawHistogram('clientSourcePortTotalBytesTCP');
             drawHistogram('clientSourcePortTotalBytesUDP');

             drawHistogram('clientSourcePortTotalPacketsTCP');
             drawHistogram('clientSourcePortTotalPacketsUDP');

             drawHistogram('clientDestinationPortNumberOfFlowsTCP');
             drawHistogram('clientDestinationPortNumberOfFlowsUDP');


             drawHistogram('clientDestinationPortTotalBytesTCP');
             drawHistogram('clientDestinationPortTotalBytesUDP');

             drawHistogram('clientDestinationPortTotalPacketsTCP');
             drawHistogram('clientDestinationPortTotalPacketsUDP');*/
            drawPortFeatures();
            drawTable('clientDestinationPortDictIPsTCP');
            drawTable('clientDestinationPortDictIPsUDP');


        }
    };
    function drawPortFeatures() {
        var s = ['client', 'server'];
        var d = ['SourcePort', 'DestinationPort'];
        var f = ['TotalBytes', 'TotalPackets', 'NumberOfFlows'];
        var p = ['TCP', 'UDP'];
        var si, di, fi, pi;
        var name;
        for (si = 0; si < s.length; ++si) {
            for (di = 0; di < d.length; ++di) {
                for (pi = 0; pi < p.length; ++pi) {
                    for (fi = 0; fi < f.length; ++fi) {
                        name = s[si] + d[di] + f[fi] + p[pi];
                        drawHistogram(name);
                    }
                }
            }
        }

    }

    function showCurrentJson() {
        visualizeJSONtoHTML(_jsonprofie[_selectedIP]['hours'][_selectedHour]);
    }
    this.showJSON = function (json) {

    //function showJSON(json) {
        _jsonprofie = json;
        $.each(_jsonprofie, function (k, v) {
            //display the key and value pair
            //alert(k + ' is ' + v);
            var $something = $('<input/>').attr({class: "btn btn-default", type: 'button', name: 'btn1', value: k});
            $(".btn-groupIPS").append($something);
        });
        $("#viztext").show();
        $(".btn-groupIPS").show();
        $(".btn-groupHours").show();


        //console.log(json);

        //var evt = $.Event('drawmap');
        //var countriesDict = json['147.32.80.9']['hours']['2016/10/05 00']['clientDictOfDistinctCountries'];
        //evt.countriesDict = countriesDict;
        var num = null;
        $("#backbutton").on("click", function () {
            var prevbutton = $(".btn-groupHours .btn[value='" + _selectedHour + "']").prev();//.value( "Hot Fuzz" );
            if (typeof prevbutton !== 'undefined') {
                prevbutton.click();
            }
        });
        $("#forwardbutton").on("click", function () {
            var prevbutton = $(".btn-groupHours .btn[value='" + _selectedHour + "']").next();//.value( "Hot Fuzz" );
            if (typeof prevbutton !== 'undefined') {
                prevbutton.click();
            }
        });
        function generateHourLayerOfButtons() {
            var hours = [];
            $(".btn-groupHours").empty();
            $.each(_jsonprofie[_selectedIP]['hours'], function (k, v) {
                hours.push(k);
                //var $something= $('<input/>').attr({ class: "btn btn-default",type: 'button', name:'btn1', value:k});
                //$(".btn-groupHours").append($something);
            });
            hours.sort();
            for (var i = 0; i < hours.length; i++) {
                var $something = $('<input/>').attr({
                    class: "btn btn-default",
                    type: 'button',
                    name: 'btn1',
                    value: hours[i]
                });
                $(".btn-groupHours").append($something);
            }
            $(".btn-groupHours .btn").on("click", function () {
                _selectedHour = $(this).val();
                $(this).addClass('btn-success').siblings().removeClass('btn-success');
                ;
                redrawVisualization();
                $('#jsonviz').empty();
                $("#show-raw-json").show();
                //showCurrentJson();
                $("#hoursumarytext").show();
                $("#regionstext").show();
                $("#histogramstext").show();
                $("#table_div .tablestext").show();
                $("#jsontext").show();
            });

        }
        $("#show-raw-json").on("click", function () {
            if (typeof _selectedIP !== 'undefined') {
                showCurrentJson();
            }
        });
        $(".btn-groupIPS .btn").on("click", function () {
            _selectedIP = $(this).val();
            //$(this).removeClass('btn btn-default');
            $(this).addClass('btn-primary').siblings().removeClass('btn-primary');
            $("#ipsumarytext").show();
            generateHourLayerOfButtons();
            //redrawVisualization();
            //drawRegioMap()
            //alert("Value is " + n);
        });
        // $(window).trigger(evt);
        $(window).smartresize(function () {
            redrawVisualization();
        });
    }

    function drawTable(name) {
        dict = _jsonprofie[_selectedIP]['hours'][_selectedHour][name];
        if ($('#table_div' + ' .' + name).length == 0) {
            var $tcp = $('<div/>').attr({class: name, type: 'div'});
            $('#table_div').append($tcp);
            $("<h4>" + (name) + ":</h4>").insertBefore('#table_div' + ' .' + name);
        }
        var small = [
            ['Port', 'IPs'],
        ];

        for (var port in dict) {
            small.push([port, Object.keys(dict[port]).toString()]);
        }

        var data = google.visualization.arrayToDataTable(small);

        var options = {}
        var parent = document.getElementById("table_div");
        var child = parent.getElementsByClassName(name)[0];

        var table = new google.visualization.Table(child);
        table.draw(data, options);

    }


    function drawHistogram(nameofdict) {
        //  <div id="chart_div"></div>
        //console.log("aaaaaaaaaaa");
        dict = _jsonprofie[_selectedIP]['hours'][_selectedHour][nameofdict];
        if ($('#histograms_div' + ' .' + nameofdict).length == 0) {
            var $histdiv = $('<div/>').attr({class: nameofdict, type: 'div'});
            $('#histograms_div').append($histdiv);

        }
        var num = [
            ['Port', 'Count'],
        ];
        var small = [
            ['Port', 'Count'],
        ];
        var binsdict = {};
        for (var bin = 0; bin < 65536 / 1024; bin++) {
            var stringid = (bin * 1024).toString() + " - " + ((bin * 1024) + 1024).toString();
            binsdict[stringid] = 0;
        }
        var arr = Object.keys(dict).map(function (key) {
            return dict[key];
        });
        var max = Math.max.apply(null, arr);

        for (var port in dict) {
            var intport = Number(port);
            var binid = Math.floor(intport / 1024);
            var stringid = (binid * 1024).toString() + " - " + ((binid * 1024) + 1024).toString();
            if (stringid in binsdict) {
                binsdict[stringid] += dict[port];
            }
            else {
                binsdict[stringid] = dict[port];
            }
        }
        var arr = Object.keys(binsdict).map(function (key) {
            return binsdict[key];
        });
        var maxim = Math.max.apply(null, arr);
        for (var bin in binsdict) {
            num.push([bin, binsdict[bin] / maxim]);
        }
        for (var port in dict) {
            small.push([port, dict[port]]);
        }
        var dataTable = new google.visualization.DataTable();
        dataTable.addColumn('string', 'port');
        dataTable.addColumn('number', 'count');
        dataTable.addColumn({type: 'string', role: 'tooltip'});

        for (var bin in binsdict) {
            dataTable.addRow([bin, binsdict[bin] / maxim, "Bin: " + bin + "\nReal number: " + binsdict[bin]]);
        }

        //var data = google.visualization.arrayToDataTable(num);

        var datasmall = google.visualization.arrayToDataTable(small);
        var options = {
            title: nameofdict + "\nNormalised with value: " + maxim.toString(),
            // legend: {position: 'none'},
            //orientation: 'vertical',
            //hAxis: { title: 'ports' },
            //chartArea:{left:20,top:0,width:'85%',height:'100%'},
            // legend: { position: 'top', maxLines: 2 },
            legend: 'none',
            // tooltip: {textStyle: {color: '#03f8ff'}, showColorCode: true},

            vAxis: {format: 'decimal', scaleType: 'mirrorLog'},
            minValue: 0,
            maxValue: 65536,
        };


        //console.log($('#histograms_div' + ' .' + nameofdict).length);
        var parent = document.getElementById("histograms_div");
        var child = parent.getElementsByClassName(nameofdict)[0];
        if (Object.keys(dict).length >= 1) {
            //var chart = new google.visualization.Histogram(child);

            // var chart = new google.charts.Bar(child);
            // chart.draw(dataTable, google.charts.Bar.convertOptions(options));

            var chart = new google.visualization.ColumnChart(child);
            chart.draw(dataTable, options);
            var current = 0;
            google.visualization.events.addListener(chart, 'select', function () {
                current = 1 - current;
                if (current == 1) {
                    // alert(current);
                    dict = _jsonprofie[_selectedIP]['hours'][_selectedHour][nameofdict];
                    var abc = chart.getSelection();

                    var rowid = abc[0].row;
                    var dataTable = new google.visualization.DataTable();
                    dataTable.addColumn('number', 'port');
                    dataTable.addColumn('number', 'count');
                    //dataTable.addColumn({type: 'number', role: 'annotation'});
                    dataTable.addColumn({type: 'string', role: 'tooltip'});
                    var maxim = 0;
                    for (port = rowid * 1024; port < (rowid * 1024) + 1024; port++) {
                        if (maxim < dict[port]) maxim = dict[port];
                    }

                    for (port = rowid * 1024; port < (rowid * 1024) + 1024; port++) {
                        if (port in dict) {
                            dataTable.addRow([port, dict[port] / maxim, "Port: " + port.toString() + "\nReal number: " + dict[port]]);
                        }
                        /*  else {
                         num.push([port,0]);
                         }*/
                    }
                    var options = {
                        title: nameofdict + "\nNormalised with value: " + maxim,
                        // legend: {position: 'top', maxLines: 2},
                        legend: 'none',
                        vAxis: {format: 'decimal', scaleType: 'mirrorLog'},
                        minValue: 0,
                        maxValue: 65536,
                        //annotations: {alwaysOutside: true}
                    };
                    chart.draw(dataTable, google.charts.Bar.convertOptions(options));
                }
                else {
                    drawHistogram(nameofdict);
                }
            });

        }
        else if (Object.keys(dict).length < 1) {
            $('#histograms_div' + ' .' + nameofdict).append("<p>" + nameofdict + ": No data availble</p>");
        }
        else {
            $("<h4>" + nameofdict + ":</h4>").insertBefore('#histograms_div' + ' .' + nameofdict);
            var chart = new google.visualization.Table(child);
            chart.draw(datasmall, options);

        }

    }

    function drawNumberOfFlowsComparison() {
        dict = _jsonprofie[_selectedIP]['hours'][_selectedHour][nameofdict];
    }

    function drawRegioMap() {

        countriesDict = _jsonprofie[_selectedIP]['hours'][_selectedHour]['clientDictNumberOfDistinctCountries'];
        console.log(countriesDict);
        if (Object.keys(countriesDict).length > 0) {
            var dataTable = new google.visualization.DataTable();
            dataTable.addColumn('string', 'Country');
            dataTable.addColumn('number', 'Number of flows');
            dataTable.addColumn({type: 'string', role: 'tooltip'});


            /* var count = [
             ['Country', 'Number of flows logartihm scale']
             ];*/
            for (var country in countriesDict) {
                //count.push([country, Math.log(countriesDict[country]) / Math.log(10)]);
                dataTable.addRow([country, Math.log(countriesDict[country]) / Math.log(10), "Number of client flows to this country: " + countriesDict[country].toString()]);
            }
            //count.push(['Czech Republic', 12]);
            //var data = google.visualization.arrayToDataTable(count);

            var options = {
                legend: 'none'
            };

            var chart = new google.visualization.GeoChart(document.getElementById('regions_div'));

            chart.draw(dataTable, options);
        }
        else {
            $("#regions_div").empty();
        }

        /*       var chart = new google.visualization.ChartWrapper({
         chartType: 'GeoChart',
         containerId: 'regions_div',
         dataTable: data,
         options: {
         // width: 600,
         legend: 'none' // hide the legend since the values will not be accurate
         },
         view: {
         columns: [0, {
         // log scale the data
         type: 'number',
         label: 'Value',
         calc: function (dt, row) {
         // find the base-10 log of the value
         var log = Math.log(dt.getValue(row, 1)) / Math.log(10);
         return {v: log, f: dt.getFormattedValue(row, 1)};
         }
         }]
         }
         });
         chart.draw();
         */
    };
}