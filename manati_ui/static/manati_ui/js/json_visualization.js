var _selectedIP;
var _selectedDate;
var _selectedHour;
var _jsonprofile;
var _hoursarray;
var datatable;
/**
 * Created by david on 5.6.17.
 */

function DrawVisualization() {

    google.charts.load('current', {'packages':['geochart','corechart','table','bar']});
    google.charts.setOnLoadCallback(redrawVisualization());
    function regioMap() {
        $(window).on('drawmap', function (e) {
            console.log('Google charts loaded'/*, e.countriesDict*/);
            //drawRegioMap()
            //Concurrent.Thread.create(drawRegioMap);
        });
    }
    function redrawVisualization() {
        //if(_selectedIP) {
    /*    if (typeof _selectedIP !== 'undefined') {
            drawSumaryTable();
            drawRegioMap();
            $('#histograms_div').empty();
            drawPortFeatures();
            drawTable('clientDestinationPortDictIPsTCP');
            drawTable('clientDestinationPortDictIPsUDP');


        }*/
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
        visualizeJSONtoHTML(_jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour]);
    }


    $("a[href='#sumary_tab']").on('shown.bs.tab', function (e) {
        var target = $(e.target).attr("href"); // activated tab
        //alert(target);
        if (typeof _selectedIP !== 'undefined') {
            drawSumaryTable();
        }
    });
    $("a[href='#regions_tab']").on('shown.bs.tab', function (e) {
        if (typeof _selectedIP !== 'undefined') {
            drawRegioMap('clientDictNumberOfDistinctCountries');
            drawRegioMap('serverDictNumberOfDistinctCountries');

        }
    });

    $("a[href='#donutchart_tab']").on('shown.bs.tab', function (e) {
        if (typeof _selectedIP !== 'undefined') {
            drawDonutChart('clientDictClassBnetworks');
            drawDonutChart('serverDictClassBnetworks');

        }
    });
    $("a[href='#histograms_tab']").on('shown.bs.tab', function (e) {
        if (typeof _selectedIP !== 'undefined') {
            $('#histograms_div').empty();
            drawPortFeatures();
        }
    });
    $("a[href='#tables_tab']").on('shown.bs.tab', function (e) {
        if (typeof _selectedIP !== 'undefined') {
            drawTable('clientDestinationPortDictIPsTCP');
            drawTable('clientDestinationPortDictIPsUDP');
            drawTable('serverSourcePortDictIPsTCP');
            drawTable('serverSourcePortDictIPsUDP');
        }
    });
    $("a[href='#json_tab']").on('shown.bs.tab', function (e) {
        /*if ($(this).hasClass("active")) {
            return false;
        }*/
        if (typeof _selectedIP !== 'undefined') {
            showCurrentJson();
        }
    });
        $("a[href='#testing_tab']").on('shown.bs.tab', function (e) {

            var mydict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour]['clientDictOfNonAnsweredConnections'];
            var data = [];

            for (var x in mydict) {
                data.push([x, mydict[x]]);
            }
            if(datatable != null || datatable != undefined) {
                datatable.clear().draw();
                datatable.rows.add(data); // Add new data
                datatable.columns.adjust().draw(); // Redraw the DataTable
            }
            else {
                datatable = $('#table_id').DataTable({
                    data: data,
                    columns: [
                        {title: "Attempted connection"},
                        {title: "Number of tries"},
                    ]
                });
            }
        });

    $('#logcheckbox').change(function() {
        refreshTab();
    });
    function generateIPLayerOfButtons()
    {
        $(".btn-groupIPS").empty();
        $(".btn-groupIPS").show();

        $.each(_jsonprofile, function (k, v) {
            //display the key and value pair
            //alert(k + ' is ' + v);
            var $something = $('<input/>').attr({class: "btn btn-default ipbuttons", type: 'button', name: 'btn1', value: k});
            $(".btn-groupIPS").append($something);
        });
        $(".btn-groupIPS .btn").on("click", function (e) {
            _selectedIP = $(this).val();
            e.preventDefault();
            //$(this).removeClass('btn btn-default');
            $(this).addClass('btn-primary').siblings().removeClass('btn-primary');
            //$("#ipsumarytext").show();
            generateDayLayerOfButtons();
            //redrawVisualization();
            //drawRegioMap()
            //alert("Value is " + n);
        });
    }
    function generateDayLayerOfButtons() {
        $(".btn-groupDays").empty();
        $(".btn-groupDays").show();
        //btn-groupDays
        var days = [];
        $.each(_jsonprofile[_selectedIP]["time"], function (k, v) {
            days.push(k);
            //var $something= $('<input/>').attr({ class: "btn btn-default",type: 'button', name:'btn1', value:k});
            //$(".btn-groupHours").append($something);
        });
        days.sort();
        for (var i = 0; i < days.length; i++) {
            var $something2 = $('<input/>').attr({
                class: "btn btn-default daybuttons",
                type: 'button',
                name: 'btn2',
                value: days[i]
            });
            if(_selectedDate == days[i])
            {
                $something2.addClass('btn-info');
            }
            $(".btn-groupDays").append($something2);
        }
        if(typeof _selectedHour !== 'undefined')
        {
            generateHourLayerOfButtons();
        }
        $(".btn-groupDays .btn").on("click", function (e) {
            _selectedDate = $(this).val();
            e.preventDefault();
            $(this).addClass('btn-info').siblings().removeClass('btn-info');
            generateHourLayerOfButtons();
        });
    }
    function generateHourLayerOfButtons() {
        var hours = [];
        $(".btn-groupHours").empty();
        $(".btn-groupHours").show();

        $.each(_jsonprofile[_selectedIP]["time"][_selectedDate], function (k, v) {
            hours.push(k);
            //var $something= $('<input/>').attr({ class: "btn btn-default",type: 'button', name:'btn1', value:k});
            //$(".btn-groupHours").append($something);
        });
        hours.sort();
        for (var i = 0; i < hours.length; i++) {
            var $something = $('<input/>').attr({
                class: "btn btn-default hourbuttons",
                type: 'button',
                name: 'btn3',
                value: hours[i]
            });
            if(_selectedHour == hours[i])
            {
                $something.addClass('btn-success');
                refreshTab();
            }
            $(".btn-groupHours").append($something);
        }
        $(".btn-groupHours .btn").on("click", function (e) {
            _selectedHour = $(this).val();
            e.preventDefault();
            $(this).addClass('btn-success').siblings().removeClass('btn-success');
            refreshTab();


        });
    }
    function refreshTab()
    {
        $("#featurestabs").css('visibility', 'visible');
        var $link = $('li.active a[data-toggle="tab"]');
        $link.parent().removeClass('active');
        var tabLink = $link.attr('href');
        $('#featurestabs a[href="' + tabLink + '"]').tab('show');
    }
    this.showJSON = function (json) {
        _jsonprofile = json;
    /*$(document).ready(function() {
        alert("Ready sir")
    });*/
    //function showJSON(json) {
        generateIPLayerOfButtons();

        $("#viztext").show();
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
        /*$("#show-raw-json").on("click", function () {
            if (typeof _selectedIP !== 'undefined') {
                showCurrentJson();
            }
        });*/
        // $(window).trigger(evt);
        $(window).smartresize(function () {
            var $link = $('li.active a[data-toggle="tab"]');
            $link.parent().removeClass('active');
            var tabLink = $link.attr('href');
            $('#featurestabs a[href="' + tabLink + '"]').tab('show');
        });
    };

    function drawTable(name) {
        dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][name];
        if ($('#table_div' + ' .' + name).length == 0) {
            var $tcp = $('<div/>').attr({class: name, type: 'div'});
            $('#table_div').append($tcp);
            $("<h4>" + (name) + ":</h4>").insertBefore('#table_div' + ' .' + name);
        }
        var small = [
            ['Port','Total Number', 'IPs'],
        ];

        for (var port in dict) {
            small.push([port,Object.keys(dict[port]).length,Object.keys(dict[port]).join(', ')]);
        }

        var data = google.visualization.arrayToDataTable(small);

        var options = {
            page: true,
            pageSize: 10,
        }
        var parent = document.getElementById("table_div");
        var child = parent.getElementsByClassName(name)[0];

        var table = new google.visualization.Table(child);
        table.draw(data, options);

    }

        function drawSumaryTable() {
        dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour]["hoursummary"];
        var array = [
            ['Feature', 'Value'],
        ];
        for (var feature in dict) {
            array.push([feature, dict[feature]]);
        }
        var data = google.visualization.arrayToDataTable(array);
        var options = {};
        var div = document.getElementById("sumary_table");
        var table = new google.visualization.Table(div);
        table.draw(data, options);

    }



    function drawHistogram(nameofdict) {
        var uselogscale;
        if ($('#logcheckbox').is(":checked"))
        {
            uselogscale = 'mirrorLog';
        }
        else {
            uselogscale = 'null';
        }
        var dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][nameofdict];
        if ($('#histograms_div' + ' .' + nameofdict).length == 0) {
            var $histdiv = $('<div/>').attr({class: nameofdict, type: 'div' ,value: 0});
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

            vAxis: {format: 'decimal', scaleType: uselogscale},
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
                    var dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][nameofdict];
                    var abc = chart.getSelection();

                    var rowid = abc[0].row;
                    var dataTable = new google.visualization.DataTable();
                    dataTable.addColumn('string', 'port');
                    dataTable.addColumn('number', 'count');
                    //dataTable.addColumn({type: 'number', role: 'annotation'});
                    dataTable.addColumn({type: 'string', role: 'tooltip'});
                    var maxim = 0;
                    for (port = rowid * 1024; port < (rowid * 1024) + 1024; port++) {
                        if (maxim < dict[port]) maxim = dict[port];
                    }

                    for (port = rowid * 1024; port < (rowid * 1024) + 1024; port++) {
                        if (port in dict) {
                            dataTable.addRow([port.toString(), dict[port] / maxim, "Port: " + port.toString() + "\nReal number: " + dict[port]]);
                        }
                    }
                    var options = {
                        title: nameofdict + "\nNormalised with value: " + maxim,
                        // legend: {position: 'top', maxLines: 2},
                        legend: 'none',
                        vAxis: {format: 'decimal', scaleType: uselogscale},
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
       var dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][nameofdict];
    }
    function drawDonutChart(nameofdict)
    {
        var dict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][nameofdict];
        if ($('#donutchart_div' + ' .' + nameofdict).length == 0) {
                var div = $('<div/>').attr({class: nameofdict+ " donutchart", type: 'div'});
                //$('#regions_div').append("<h4>" + nameofdict + ":</h4>");
                $('#donutchart_div').append(div);
        }
        var dataTable = new google.visualization.DataTable();
            dataTable.addColumn('string', 'ClassB IP');
            dataTable.addColumn('number', 'Number of flows to the ClassB network');
            //dataTable.addColumn({type: 'string', role: 'tooltip'});

        for (var classB in dict) {
                dataTable.addRow([classB, dict[classB]]);
        }
        var options = {
          title: nameofdict,
          //is3D: true,
          pieHole: 0.4,
        };

        var parent = document.getElementById("donutchart_div");
        var child = parent.getElementsByClassName(nameofdict)[0];
        var chart = new google.visualization.PieChart(child/*document.getElementById('regions_div')*/);
        chart.draw(dataTable, options);
    }
    function drawRegioMap(name) {

        var countriesDict = _jsonprofile[_selectedIP]["time"][_selectedDate][_selectedHour][name];
        if (Object.keys(countriesDict).length > 0) {
            if ($('#regions_div' + ' .' + name).length == 0) {
                var regiodiv = $('<div/>').attr({class: name, type: 'div'});
                $('#regions_div').append("<h4>" + name + ":</h4>");
                $('#regions_div').append(regiodiv);
            }


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
            var parent = document.getElementById("regions_div");
            var child = parent.getElementsByClassName(name)[0];
            var chart = new google.visualization.GeoChart(child/*document.getElementById('regions_div')*/);

            chart.draw(dataTable, options);
        }
        else {
            if($('#regions_div' + ' .' + name).length == 0) {
                var regiodiv = $('<div/>').attr({class: name, type: 'div'});
                $('#regions_div').append("<h4> No data avaible </h4>");
            }
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